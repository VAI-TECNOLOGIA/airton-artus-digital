import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { audit } from '../utils/audit.js';
import { crudFactory } from '../utils/crudFactory.js';
import { supporterScope } from '../utils/scope.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';
import { SUPPORT_TYPES, SUPPORTER_STATUS } from '../utils/enums.js';
import { nullifyEmpty, onlyDigits, brDigits } from '../utils/helpers.js';
import { hashPassword } from '../utils/password.js';
import { signResetToken } from '../utils/jwt.js';
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

/** Normaliza cidade: trim + espaço único + Title Case (preserva acentos) — reduz duplicidade. */
function normCity(s) {
  if (!s) return s;
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/(^|[\s\-'])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

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
      data.cityName = city.name; // nome canônico da tabela City
    }
  }
  if (data.cityName) data.cityName = normCity(data.cityName);
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
  if (data.cityName) data.cityName = normCity(data.cityName);
  const supporter = await prisma.supporter.update({ where: { id: req.params.id }, data, include });
  await audit({ userId: req.user?.id, action: 'UPDATE', entity: 'Supporter', entityId: supporter.id, ip: req.ip });
  res.json(supporter);
});

/** Cidades já cadastradas (distintas) — alimenta o autocomplete e evita duplicidade. */
export const listCities = asyncHandler(async (req, res) => {
  const rows = await prisma.supporter.findMany({
    where: { cityName: { not: null } },
    distinct: ['cityName'],
    select: { cityName: true },
    orderBy: { cityName: 'asc' },
  });
  res.json({ data: rows.map((r) => ({ name: r.cityName })).filter((r) => r.name) });
});

/** Provisiona o acesso do apoiador (telefone = login) e envia o link de definir senha pela API OFICIAL. */
export const sendAccess = asyncHandler(async (req, res) => {
  const s = await prisma.supporter.findUnique({ where: { id: req.params.id } });
  if (!s) throw new AppError('Apoiador não encontrado', 404);
  const phone = brDigits(s.whatsapp || s.phone);
  if (!phone) throw new AppError('Apoiador sem telefone cadastrado.', 400);

  // Cria (ou reaproveita) a conta de acesso; o telefone é o login.
  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    let email = s.email && s.email.includes('@') ? s.email.toLowerCase() : `${phone}@wa.airtonartus.app`;
    if (await prisma.user.findUnique({ where: { email } })) email = `${phone}.${Date.now()}@wa.airtonartus.app`;
    user = await prisma.user.create({
      data: {
        name: s.name || 'Apoiador',
        email,
        phone,
        role: 'PARCEIRO',
        password: await hashPassword(`${Math.random().toString(36).slice(2, 10)}Aa1!`),
      },
    });
  }

  // Link de "Definir senha" (token) enviado pelo template oficial.
  const token = signResetToken({ sub: user.id });
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: new Date(Date.now() + 48 * 3600_000) },
  });
  const result = await sendWhatsApp({
    to: phone,
    template: {
      name: 'airton_redefinir_senha',
      language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: user.name || 'tudo bem' }] },
        { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: token }] },
      ],
    },
  });
  if (result?.raw?.error) throw new AppError(result.raw.error.message || 'Falha no envio pela Meta.', 400);
  res.json({ ok: true, login: phone, provider: result?.provider, simulated: !!result?.simulated });
});

export const remove = asyncHandler(async (req, res) => {
  await prisma.supporter.delete({ where: { id: req.params.id } });
  await audit({ userId: req.user?.id, action: 'DELETE', entity: 'Supporter', entityId: req.params.id, ip: req.ip });
  res.status(204).send();
});

// ============================================================
//  Importação em massa (planilha/CSV) — cria vários apoiadores
//  de uma vez, reaproveitando antifraude, vínculo de cidade e geo.
//  Recebe um LOTE de linhas por chamada (o front envia em blocos).
// ============================================================
const importRowSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  cep: z.string().trim().optional(),
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  cityName: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  facebook: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  supportType: z.string().trim().optional(),
}).passthrough();

const MAX_IMPORT_ROWS = 2000; // por chamada; o front envia em blocos

export const importBatch = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const defaults = req.body?.defaults || {};
  const defaultType = SUPPORT_TYPES.includes(defaults.supportType) ? defaults.supportType : 'MATERIAL_DIGITAL';
  const coordinatorId = defaults.coordinatorId || null;

  if (!rows.length) throw new AppError('Nenhuma linha para importar.', 400);
  if (rows.length > MAX_IMPORT_ROWS) throw new AppError(`Envie no máximo ${MAX_IMPORT_ROWS} linhas por vez.`, 400);

  const result = { received: rows.length, imported: 0, duplicates: 0, blacklisted: 0, invalid: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const raw = nullifyEmpty(importRowSchema.parse(rows[i] || {}));
    const name = (raw.name || '').trim();
    const phone = onlyDigits(raw.phone);

    // Linha inválida: sem nome ou sem telefone válido (mín. 8 dígitos).
    if (name.length < 2 || phone.length < 8) {
      result.invalid++;
      if (result.errors.length < 50) result.errors.push({ row: raw._row || i + 1, reason: !name ? 'sem nome' : 'telefone inválido' });
      continue;
    }

    try {
      const [black, existing] = await Promise.all([
        prisma.blacklist.findFirst({ where: { phone } }),
        prisma.supporter.findFirst({ where: { phone }, select: { id: true } }),
      ]);
      if (black) { result.blacklisted++; continue; }
      if (existing) { result.duplicates++; continue; }

      const supportType = SUPPORT_TYPES.includes(raw.supportType) ? raw.supportType : defaultType;

      let cityId = null;
      let regionId = null;
      if (raw.cityName) {
        const city = await linkCityByName(prisma, raw.cityName);
        if (city) { cityId = city.id; regionId = city.regionId; }
      }
      const geo = fallbackLatLng({ cityName: raw.cityName, neighborhood: raw.neighborhood, seed: phone });

      const created = await prisma.supporter.create({
        data: {
          name,
          phone,
          whatsapp: onlyDigits(raw.whatsapp) || phone,
          email: raw.email || null,
          cpf: raw.cpf || null,
          cep: raw.cep || null,
          street: raw.street || null,
          number: raw.number || null,
          complement: raw.complement || null,
          neighborhood: raw.neighborhood || null,
          cityName: raw.cityName || null,
          cityId,
          regionId,
          lat: geo.lat,
          lng: geo.lng,
          instagram: raw.instagram || null,
          facebook: raw.facebook || null,
          notes: raw.notes || null,
          supportType,
          status: 'NOVO',
          coordinatorId,
        },
        select: { id: true },
      });

      if (supportType === 'VOLUNTARIO') {
        await prisma.volunteer.create({ data: { supporterId: created.id } });
      }
      result.imported++;
    } catch (e) {
      result.invalid++;
      if (result.errors.length < 50) result.errors.push({ row: raw._row || i + 1, reason: 'erro ao gravar' });
    }
  }

  await audit({ userId: req.user?.id, action: 'IMPORT', entity: 'Supporter', changes: { imported: result.imported, received: result.received }, ip: req.ip });
  res.json(result);
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
