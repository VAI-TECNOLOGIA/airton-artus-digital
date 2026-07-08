import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { audit } from '../utils/audit.js';
import { crudFactory } from '../utils/crudFactory.js';
import { supporterScope } from '../utils/scope.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';
import { SUPPORT_TYPES, SUPPORTER_STATUS } from '../utils/enums.js';
import { nullifyEmpty, onlyDigits } from '../utils/helpers.js';
import { fallbackLatLng, linkCityByName } from '../utils/geo.js';

const include = {
  region: { select: { id: true, name: true } },
  city: { select: { id: true, name: true } },
  coordinator: { select: { id: true, name: true } },
  volunteer: true,
};

const factory = crudFactory('supporter', {
  include,
  scope: supporterScope,
  searchFields: ['name', 'phone', 'email', 'cityName', 'neighborhood'],
  allowedFilters: ['status', 'supportType', 'regionId', 'cityId', 'coordinatorId'],
});

export const { list, get } = factory;

const createSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(8, 'Telefone obrigatório'),
  whatsapp: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  cpf: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
  complement: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  cityId: z.string().uuid().nullable().optional(),
  regionId: z.string().uuid().nullable().optional(),
  lat: z.coerce.number().nullable().optional(),
  lng: z.coerce.number().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  supportType: z.enum(SUPPORT_TYPES).optional(),
  status: z.enum(SUPPORTER_STATUS).optional(),
  notes: z.string().nullable().optional(),
  coordinatorId: z.string().uuid().nullable().optional(),
});

export const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(nullifyEmpty(req.body));
  const phone = onlyDigits(data.phone);

  const [black, existing] = await Promise.all([
    prisma.blacklist.findFirst({ where: { phone } }),
    prisma.supporter.findFirst({ where: { phone } }),
  ]);

  let status = data.status || 'NOVO';
  let flaggedReason = null;
  let duplicateOfId = null;

  if (black) {
    status = 'BLACKLIST';
    flaggedReason = `Telefone consta na blacklist: ${black.reason}`;
  } else if (existing) {
    status = 'SUSPEITO';
    flaggedReason = `Telefone duplicado — já cadastrado para "${existing.name}".`;
    duplicateOfId = existing.id;
    await prisma.supporter.update({
      where: { id: existing.id },
      data: { status: 'SUSPEITO', flaggedReason: 'Telefone usado em mais de um cadastro.' },
    });
  }

  // Conexão com o mapa: sem lat/lng manual, usa centroide da cidade + jitter.
  // Sem cityId, tenta vincular pela cidade digitada (habilita filtro por região).
  if (!data.cityId && data.cityName) {
    const city = await linkCityByName(prisma, data.cityName);
    if (city) {
      data.cityId = city.id;
      if (!data.regionId) data.regionId = city.regionId;
    }
  }
  if (data.lat == null || data.lng == null) {
    const geo = fallbackLatLng({ cityName: data.cityName, neighborhood: data.neighborhood, seed: phone });
    data.lat = geo.lat;
    data.lng = geo.lng;
  }

  const supporter = await prisma.supporter.create({
    data: {
      ...data,
      phone,
      whatsapp: onlyDigits(data.whatsapp) || phone,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      status,
      flaggedReason,
      duplicateOfId,
    },
    include,
  });

  if (supporter.supportType === 'VOLUNTARIO' && status !== 'BLACKLIST') {
    await prisma.volunteer.create({ data: { supporterId: supporter.id } });
    await sendConfirmation(supporter);
  }

  await audit({
    userId: req.user?.id,
    action: 'CREATE',
    entity: 'Supporter',
    entityId: supporter.id,
    changes: { status, flaggedReason },
    ip: req.ip,
  });

  res.status(201).json({ supporter, warning: flaggedReason });
});

export const update = asyncHandler(async (req, res) => {
  const data = nullifyEmpty(req.body);
  if (data.birthDate) data.birthDate = new Date(data.birthDate);
  if (data.phone) data.phone = onlyDigits(data.phone);
  delete data.id;
  delete data.volunteer;
  delete data.region;
  delete data.city;
  delete data.coordinator;
  const supporter = await prisma.supporter.update({ where: { id: req.params.id }, data, include });
  await audit({ userId: req.user?.id, action: 'UPDATE', entity: 'Supporter', entityId: supporter.id, ip: req.ip });
  res.json(supporter);
});

export const remove = asyncHandler(async (req, res) => {
  await prisma.supporter.delete({ where: { id: req.params.id } });
  await audit({ userId: req.user?.id, action: 'DELETE', entity: 'Supporter', entityId: req.params.id, ip: req.ip });
  res.status(204).send();
});

export const listSuspects = asyncHandler(async (req, res) => {
  const data = await prisma.supporter.findMany({
    where: { status: 'SUSPEITO' },
    include: { ...include, duplicateOf: { select: { id: true, name: true, phone: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ data });
});

export const confirmVolunteer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { helpPreference } = req.body;
  const supporter = await prisma.supporter.findUnique({ where: { id }, include: { volunteer: true } });
  if (!supporter) throw new AppError('Apoiador não encontrado', 404);

  let volunteer = supporter.volunteer;
  if (!volunteer) volunteer = await prisma.volunteer.create({ data: { supporterId: id } });

  const updated = await prisma.volunteer.update({
    where: { id: volunteer.id },
    data: {
      confirmed: true,
      confirmedAt: new Date(),
      confirmationChannel: 'WHATSAPP',
      active: true,
      helpPreference: helpPreference || volunteer.helpPreference,
    },
  });

  await prisma.supporter.update({ where: { id }, data: { status: 'CONFIRMADO' } });
  await prisma.volunteerStatusHistory.create({
    data: {
      volunteerId: volunteer.id,
      fromStatus: supporter.status,
      toStatus: 'CONFIRMADO',
      reason: 'Confirmação via WhatsApp',
      changedById: req.user?.id,
    },
  });

  res.json(updated);
});

export const toBlacklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const s = await prisma.supporter.findUnique({ where: { id } });
  if (!s) throw new AppError('Apoiador não encontrado', 404);

  await prisma.blacklist.create({
    data: { phone: s.phone, cpf: s.cpf, name: s.name, reason: reason || 'Marcado manualmente', createdById: req.user?.id },
  });
  const updated = await prisma.supporter.update({
    where: { id },
    data: { status: 'BLACKLIST', flaggedReason: reason || 'Movido para blacklist' },
  });
  await audit({ userId: req.user?.id, action: 'BLACKLIST', entity: 'Supporter', entityId: id, ip: req.ip });
  res.json(updated);
});

async function sendConfirmation(supporter) {
  const body = `Olá ${supporter.name}! Aqui é da equipe do Airton Artus. Recebemos seu cadastro como voluntário(a). Você confirma sua participação? Responda *SIM* para confirmar.`;
  const result = await sendWhatsApp({ to: supporter.whatsapp || supporter.phone, body });
  await prisma.conversation.create({
    data: {
      channel: 'WHATSAPP',
      status: 'AGUARDANDO',
      contactName: supporter.name,
      contactPhone: supporter.phone,
      supporterId: supporter.id,
      lastMessageAt: new Date(),
      messages: {
        create: { direction: 'OUTBOUND', body, channel: 'WHATSAPP', externalId: result.id },
      },
    },
  });
}
