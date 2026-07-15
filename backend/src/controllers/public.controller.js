import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';
import { SUPPORT_TYPES } from '../utils/enums.js';
import { nullifyEmpty, onlyDigits } from '../utils/helpers.js';
import { fallbackLatLng, linkCityByName } from '../utils/geo.js';
import { createDeletionRequest, confirmDeletionRequest } from '../services/privacy.service.js';

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
    const body = `Olá ${supporter.name}! Recebemos seu cadastro na pré-campanha do Airton Artus. Responda *SIM* para confirmar sua participação.`;
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

// ============================================================
//  LGPD — exclusão de dados via web (autoatendimento do titular).
//  Fluxo em 2 passos: pede código → código chega no WhatsApp do
//  próprio número → confirma → exclusão imediata. A resposta do
//  passo 1 é sempre genérica (não revela se o telefone existe).
// ============================================================

const deletionMessage =
  'Se este número tiver cadastro na pré-campanha, você receberá um código de confirmação no WhatsApp em instantes.';

export const requestDataDeletion = asyncHandler(async (req, res) => {
  const { phone: raw } = z.object({ phone: z.string().min(8, 'Informe um telefone válido') }).parse(req.body);
  const phone = onlyDigits(raw);

  const code = await createDeletionRequest(phone, { ip: req.ip });
  if (code) {
    await sendWhatsApp({
      to: phone,
      body:
        `Pré-campanha Airton Artus — recebemos um pedido de EXCLUSÃO dos dados deste número. ` +
        `Código de confirmação: *${code}* (válido por 15 minutos). ` +
        `Se não foi você, ignore esta mensagem e nada será excluído.`,
    });
  }

  // Resposta idêntica com ou sem cadastro (não revela existência do telefone).
  res.json({ message: deletionMessage, devCode: process.env.NODE_ENV === 'development' ? code || undefined : undefined });
});

export const confirmDataDeletion = asyncHandler(async (req, res) => {
  const { phone: raw, code } = z
    .object({ phone: z.string().min(8), code: z.string().regex(/^\d{6}$/, 'Código de 6 dígitos') })
    .parse(req.body);
  const phone = onlyDigits(raw);

  const summary = await confirmDeletionRequest(phone, code, { requestedBy: 'titular (web)', ip: req.ip });
  if (!summary) {
    return res.status(400).json({ error: 'Código inválido ou expirado. Solicite um novo código.' });
  }

  res.json({
    ok: true,
    message: 'Seus dados foram excluídos permanentemente da base da pré-campanha.',
    summary,
  });
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
