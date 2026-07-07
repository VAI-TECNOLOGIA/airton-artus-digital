import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';
import { SUPPORT_TYPES } from '../utils/enums.js';
import { nullifyEmpty, onlyDigits } from '../utils/helpers.js';
import { fallbackLatLng, linkCityByName } from '../utils/geo.js';

// ============================================================
//  Endpoints PÚBLICOS (sem autenticação) — usados pela Landing Page.
//  Reaproveitam a regra antifraude do cadastro de apoiadores.
// ============================================================

const joinSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  phone: z.string().min(8, 'Informe um telefone válido'),
  email: z.string().email().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  supportType: z.enum(SUPPORT_TYPES).optional(),
});

export const join = asyncHandler(async (req, res) => {
  const data = joinSchema.parse(nullifyEmpty(req.body));
  const phone = onlyDigits(data.phone);

  // Trava global de velocidade (anti-bot em serverless): o rate limit por
  // instância não vale entre lambdas, então limitamos o TOTAL de cadastros
  // por minuto no banco. 60/min = pico legítimo de comício passa; enxurrada
  // de bot degrada por 1 minuto e volta.
  const recentJoins = await prisma.supporter.count({
    where: { createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recentJoins >= 60) {
    return res.status(429).json({ error: 'Estamos recebendo muitos cadastros agora. Tente novamente em instantes.' });
  }

  const [black, existing] = await Promise.all([
    prisma.blacklist.findFirst({ where: { phone } }),
    prisma.supporter.findFirst({ where: { phone } }),
  ]);

  let status = 'NOVO';
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

  // Conexão com o mapa/filtros: vincula cidade→região e garante lat/lng
  // aproximado (centroide da cidade + jitter) quando não há coordenada.
  const cityName = data.cityName || 'Porto Alegre';
  const city = await linkCityByName(prisma, cityName);
  const geo = fallbackLatLng({ cityName, neighborhood: data.neighborhood, seed: phone });

  const supporter = await prisma.supporter.create({
    data: {
      name: data.name,
      phone,
      whatsapp: phone,
      email: data.email || null,
      neighborhood: data.neighborhood || null,
      cityName,
      cityId: city?.id || null,
      regionId: city?.regionId || null,
      lat: geo.lat,
      lng: geo.lng,
      supportType: data.supportType || 'NOTICIAS',
      status,
      flaggedReason,
      duplicateOfId,
    },
  });

  if (supporter.supportType === 'VOLUNTARIO' && status !== 'BLACKLIST') {
    await prisma.volunteer.create({ data: { supporterId: supporter.id } });
    const body = `Olá ${supporter.name}! 👋 Recebemos seu cadastro na campanha do Candidato Teste. Responda *SIM* para confirmar sua participação. 💪`;
    const r = await sendWhatsApp({ to: phone, body });
    await prisma.conversation.create({
      data: {
        channel: 'WHATSAPP', status: 'AGUARDANDO', contactName: supporter.name, contactPhone: phone,
        supporterId: supporter.id, lastMessageAt: new Date(),
        messages: { create: { direction: 'OUTBOUND', body, channel: 'WHATSAPP', externalId: r.id } },
      },
    });
  }

  res.status(201).json({ ok: true, message: 'Cadastro recebido! Em breve entraremos em contato. 💪' });
});

export const stats = asyncHandler(async (req, res) => {
  const [supporters, volunteers, actions, banners] = await Promise.all([
    prisma.supporter.count(),
    prisma.volunteer.count(),
    prisma.streetAction.count({ where: { status: 'REALIZADA' } }),
    prisma.bannerLocation.count({ where: { status: { in: ['AUTORIZADO', 'INSTALADO'] } } }),
  ]);
  res.json({ supporters, volunteers, actions, banners });
});

export const campaign = asyncHandler(async (req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: 'campaign' } });
  res.json(row?.value || {});
});
