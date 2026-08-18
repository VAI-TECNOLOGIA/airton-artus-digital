import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendViaChannel, renderTemplate } from '../services/messaging.service.js';
import { optedOutPhones } from '../services/privacy.service.js';
import { CHANNELS } from '../utils/enums.js';
import { CAMPAIGN_TEMPLATES, findTemplate, buildTemplatePayload } from '../config/waTemplates.js';

// Catálogo de templates oficiais aprovados disponíveis para campanha.
export const templates = asyncHandler(async (_req, res) => {
  res.json({ data: CAMPAIGN_TEMPLATES });
});

export const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const data = await prisma.broadcastCampaign.findMany({
    where,
    include: { owner: { select: { id: true, name: true } }, _count: { select: { contacts: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data });
});

export const get = asyncHandler(async (req, res) => {
  const c = await prisma.broadcastCampaign.findUnique({
    where: { id: req.params.id },
    include: { contacts: { take: 500, orderBy: { createdAt: 'asc' } }, owner: { select: { id: true, name: true } } },
  });
  if (!c) throw new AppError('Campanha não encontrada', 404);
  res.json(c);
});

const schema = z.object({
  name: z.string().min(2),
  message: z.string().min(2),
  channel: z.enum(CHANNELS).optional(),
  templateName: z.string().nullable().optional(),
  templateVars: z.record(z.string()).nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);

  // Se a campanha usa template oficial, valida o nome e as variáveis fixas.
  let templateName = null;
  let templateVars = null;
  if (data.templateName) {
    const tpl = findTemplate(data.templateName);
    if (!tpl) throw new AppError('Template não encontrado ou indisponível para campanha.', 400);
    const fixed = tpl.vars.filter((v) => !v.auto);
    const vars = data.templateVars || {};
    const missing = fixed.filter((v) => !String(vars[v.key] || '').trim()).map((v) => v.label || v.key);
    if (missing.length) throw new AppError(`Preencha as variáveis do template: ${missing.join(', ')}.`, 400);
    templateName = tpl.name;
    templateVars = Object.fromEntries(fixed.map((v) => [v.key, String(vars[v.key]).trim()]));
  }

  const c = await prisma.broadcastCampaign.create({
    data: {
      name: data.name,
      message: data.message,
      channel: data.channel || 'WHATSAPP',
      templateName,
      templateVars,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      ownerId: req.user?.id,
    },
  });
  res.status(201).json(c);
});

export const importContacts = asyncHandler(async (req, res) => {
  const { contacts, csv } = req.body;
  let rows = [];
  if (Array.isArray(contacts)) rows = contacts;
  else if (typeof csv === 'string') rows = parseCsv(csv);
  else throw new AppError('Envie "contacts" (array) ou "csv" (string).', 400);

  const campaignId = req.params.id;
  const valid = rows.filter((r) => r.telefone || r.phone);
  await prisma.broadcastContact.createMany({
    data: valid.map((r) => ({
      campaignId,
      name: r.nome || r.name || '',
      phone: String(r.telefone || r.phone),
      cityName: r.cidade || r.cityName || null,
      neighborhood: r.bairro || r.neighborhood || null,
      responsible: r.responsavel || r.responsible || null,
    })),
  });

  const total = await prisma.broadcastContact.count({ where: { campaignId } });
  await prisma.broadcastCampaign.update({ where: { id: campaignId }, data: { totalContacts: total, pendingCount: total } });
  res.status(201).json({ imported: valid.length, total });
});

// Bug 2: envio em LOTES. Cada chamada processa até BATCH pendentes e responde
// rapidamente (nada de request pendente por minutos). O cliente repete até "done".
const BATCH = 25;

export const send = asyncHandler(async (req, res) => {
  const campaignId = req.params.id;
  const campaign = await prisma.broadcastCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError('Campanha não encontrada', 404);

  const batch = await prisma.broadcastContact.findMany({
    where: { campaignId, status: 'PENDENTE' },
    take: BATCH,
    orderBy: { createdAt: 'asc' },
  });

  if (batch.length && campaign.status !== 'ENVIANDO') {
    await prisma.broadcastCampaign.update({ where: { id: campaignId }, data: { status: 'ENVIANDO' } });
  }

  // LGPD: contatos que pediram "SAIR" não recebem — marcamos FALHA com motivo
  // explícito pra ficar visível no relatório da campanha.
  const optedOut = await optedOutPhones(batch.map((c) => c.phone));

  // Campanha via template oficial (entrega fora da janela de 24h) vs texto livre.
  const tpl = campaign.templateName ? findTemplate(campaign.templateName) : null;

  let sent = 0;
  let failed = 0;
  for (const c of batch) {
    if (optedOut.has(c.phone)) {
      await prisma.broadcastContact.update({
        where: { id: c.id },
        data: { status: 'FALHA', error: 'Descadastrado (opt-out LGPD) — não enviado' },
      });
      failed++;
      continue;
    }
    try {
      if (tpl) {
        const template = buildTemplatePayload(tpl, { name: c.name, phone: c.phone }, campaign.templateVars || {});
        await sendViaChannel(campaign.channel, { to: c.phone, template });
      } else {
        const body = renderTemplate(campaign.message, { nome: c.name, cidade: c.cityName, bairro: c.neighborhood, responsavel: c.responsible });
        await sendViaChannel(campaign.channel, { to: c.phone, body });
      }
      await prisma.broadcastContact.update({ where: { id: c.id }, data: { status: 'ENVIADO', sentAt: new Date() } });
      sent++;
    } catch (e) {
      await prisma.broadcastContact.update({ where: { id: c.id }, data: { status: 'FALHA', error: e.message } });
      failed++;
    }
  }

  const remaining = await prisma.broadcastContact.count({ where: { campaignId, status: 'PENDENTE' } });
  const updated = await prisma.broadcastCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: sent },
      failedCount: { increment: failed },
      pendingCount: remaining,
      status: remaining === 0 ? 'CONCLUIDA' : 'ENVIANDO',
    },
  });

  res.status(202).json({
    sent,
    failed,
    remaining,
    done: remaining === 0,
    sentCount: updated.sentCount,
    failedCount: updated.failedCount,
    totalContacts: updated.totalContacts,
  });
});

/** Pausa o envio (status PAUSADA) — usado pelo botão Cancelar. */
export const pause = asyncHandler(async (req, res) => {
  const c = await prisma.broadcastCampaign.update({ where: { id: req.params.id }, data: { status: 'PAUSADA' } });
  res.json({ ok: true, status: c.status });
});

export const remove = asyncHandler(async (req, res) => {
  await prisma.broadcastCampaign.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

function parseCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines.shift().split(',').map((h) => h.trim().toLowerCase());
  return lines.map((line) => {
    const cells = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] || '').trim();
    });
    return obj;
  });
}
