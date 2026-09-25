import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendViaChannel, renderTemplate } from '../services/messaging.service.js';
import { optedOutPhones } from '../services/privacy.service.js';
import { CHANNELS } from '../utils/enums.js';
import { CAMPAIGN_TEMPLATES, buildTemplatePayload } from '../config/waTemplates.js';
import { syncWaTemplates, getTemplateShape, shapeFromRow } from '../services/waTemplateSync.service.js';
import { notifyUsers } from '../services/push.service.js';
import { audit } from '../utils/audit.js';

// Catálogo de templates oficiais disponíveis para campanha.
// Fonte: banco (sincronizado da Meta) — cai no catálogo do código
// enquanto ninguém sincronizou (compatibilidade).
export const templates = asyncHandler(async (_req, res) => {
  const rows = await prisma.waTemplate.findMany({
    where: { status: 'APPROVED' },
    orderBy: { label: 'asc' },
  });
  if (!rows.length) return res.json({ data: CAMPAIGN_TEMPLATES });
  res.json({ data: rows.map(shapeFromRow) });
});

// Sincroniza os templates aprovados na Meta para o banco (botão "Sincronizar").
export const syncTemplates = asyncHandler(async (req, res) => {
  const result = await syncWaTemplates();
  await audit({ userId: req.user?.id, action: 'SYNC', entity: 'WaTemplate', changes: { total: result.total, approved: result.approved }, ip: req.ip });
  res.json({ ok: true, ...result });
});

/** Valida a escolha de template + variáveis fixas. Retorna {templateName, templateVars, headerImageUrl} ou lança. */
async function resolveTemplateSelection(templateName, templateVars, headerImageUrl) {
  if (!templateName) return { templateName: null, templateVars: null, headerImageUrl: null };
  const tpl = await getTemplateShape(templateName);
  if (!tpl) throw new AppError('Template não encontrado ou indisponível para campanha.', 400);
  const fixed = tpl.vars.filter((v) => !v.auto);
  const vars = templateVars || {};
  const missing = fixed.filter((v) => !String(vars[v.key] || '').trim()).map((v) => v.label || v.key);
  if (missing.length) throw new AppError(`Preencha as variáveis do template: ${missing.join(', ')}.`, 400);

  // Cabeçalho de imagem: usa o que veio da campanha, senão a imagem do sistema.
  let headerImg = null;
  if (tpl.header?.format === 'IMAGE') {
    headerImg = (headerImageUrl && String(headerImageUrl).trim()) || tpl.header.sample || null;
    if (!headerImg) throw new AppError('Este modelo tem uma imagem no topo. Carregue a imagem para poder disparar.', 400);
  }

  return {
    templateName: tpl.name,
    templateVars: Object.fromEntries(fixed.map((v) => [v.key, String(vars[v.key]).trim()])),
    headerImageUrl: headerImg,
  };
}

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
  headerImageUrl: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const { templateName, templateVars, headerImageUrl } = await resolveTemplateSelection(data.templateName, data.templateVars, data.headerImageUrl);

  const c = await prisma.broadcastCampaign.create({
    data: {
      name: data.name,
      message: data.message,
      // Canais que entregam de verdade: WhatsApp (base externa) ou
      // Comunicado interno (push + sino p/ todos os usuários).
      channel: data.channel === 'CHAT_INTERNO' ? 'CHAT_INTERNO' : 'WHATSAPP',
      templateName,
      templateVars,
      headerImageUrl,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      ownerId: req.user?.id,
    },
  });
  res.status(201).json(c);
});

// ---------------------------------------------------------------
//  Público a partir das LISTAS DO SISTEMA (base de apoiadores).
//  Antes só dava pra importar CSV; agora dá pra puxar direto a
//  base filtrada (tipo de apoio, status, região, cidade, coordenador,
//  só voluntários), sem sair do sistema.
// ---------------------------------------------------------------
function buildAudienceWhere(q = {}) {
  const where = {
    // Nunca inclui quem pediu pra sair (LGPD) nem blacklist.
    optOutAt: null,
    status: { not: 'BLACKLIST' },
    phone: { not: '' },
  };
  if (q.supportType) where.supportType = q.supportType;
  if (q.status) where.status = q.status; // sobrescreve o "not BLACKLIST" só se pedirem status específico
  if (q.regionId) where.regionId = q.regionId;
  if (q.cityName) where.cityName = q.cityName;
  if (q.coordinatorId) where.coordinatorId = q.coordinatorId;
  if (q.onlyVolunteers === 'true' || q.onlyVolunteers === true) where.volunteer = { isNot: null };
  return where;
}

/** Contagem prévia — quantos apoiadores batem com os filtros (pro botão "Adicionar (N)"). */
export const audienceCount = asyncHandler(async (req, res) => {
  const count = await prisma.supporter.count({ where: buildAudienceWhere(req.query) });
  res.json({ count });
});

/** Adiciona à campanha os apoiadores da base que batem com os filtros (dedupe por telefone). */
export const addAudience = asyncHandler(async (req, res) => {
  const campaignId = req.params.id;
  const campaign = await prisma.broadcastCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError('Campanha não encontrada', 404);

  const where = buildAudienceWhere(req.body || {});
  const supporters = await prisma.supporter.findMany({
    where,
    select: { id: true, name: true, phone: true, cityName: true, neighborhood: true, coordinator: { select: { name: true } } },
  });
  if (!supporters.length) return res.json({ added: 0, skippedExisting: 0, matched: 0 });

  // Dedupe: telefones já presentes nesta campanha não entram de novo.
  const existing = await prisma.broadcastContact.findMany({ where: { campaignId }, select: { phone: true } });
  const seen = new Set(existing.map((c) => onlyDigitsPhone(c.phone)));

  const toAdd = [];
  for (const s of supporters) {
    const key = onlyDigitsPhone(s.phone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    toAdd.push({
      campaignId,
      name: s.name || '',
      phone: s.phone,
      cityName: s.cityName || null,
      neighborhood: s.neighborhood || null,
      responsible: s.coordinator?.name || null,
      supporterId: s.id,
      source: 'BASE',
    });
  }

  if (toAdd.length) await prisma.broadcastContact.createMany({ data: toAdd });
  const total = await prisma.broadcastContact.count({ where: { campaignId } });
  await prisma.broadcastCampaign.update({
    where: { id: campaignId },
    data: { totalContacts: total, pendingCount: await prisma.broadcastContact.count({ where: { campaignId, status: 'PENDENTE' } }) },
  });
  res.status(201).json({ added: toAdd.length, skippedExisting: supporters.length - toAdd.length, matched: supporters.length, total });
});

function onlyDigitsPhone(p) {
  return String(p || '').replace(/\D/g, '');
}

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

  // COMUNICADO INTERNO: notifica TODOS os usuários — push (app) + sino (app e
  // navegador). Envio único (não usa lista de contatos nem WhatsApp/Meta).
  if (campaign.channel === 'CHAT_INTERNO') {
    const result = await notifyUsers(
      { mode: 'all' },
      { title: campaign.name, body: campaign.message, kind: 'campanha', link: '/mural' },
    );
    const updated = await prisma.broadcastCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'CONCLUIDA',
        totalContacts: result.recipients,
        sentCount: result.recipients,
        pendingCount: 0,
        failedCount: 0,
      },
    });
    await audit({ userId: req.user?.id, action: 'SEND', entity: 'BroadcastCampaign', entityId: campaignId, changes: { channel: 'CHAT_INTERNO', recipients: result.recipients, push: result.push }, ip: req.ip });
    return res.status(202).json({
      sent: result.recipients,
      failed: 0,
      remaining: 0,
      done: true,
      sentCount: updated.sentCount,
      failedCount: 0,
      totalContacts: updated.totalContacts,
      internal: true,
      push: result.push,
    });
  }

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
  const tpl = campaign.templateName ? await getTemplateShape(campaign.templateName) : null;
  // Imagem do cabeçalho: a da campanha, senão a imagem do sistema (template).
  const headerImageUrl = campaign.headerImageUrl || tpl?.header?.sample || null;

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
        const template = buildTemplatePayload(tpl, { name: c.name, phone: c.phone }, campaign.templateVars || {}, headerImageUrl);
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

/** Vincula (ou remove) um template oficial numa campanha já criada. */
export const setTemplate = asyncHandler(async (req, res) => {
  const { templateName, templateVars, headerImageUrl } = await resolveTemplateSelection(req.body.templateName, req.body.templateVars, req.body.headerImageUrl);
  const c = await prisma.broadcastCampaign.update({
    where: { id: req.params.id },
    data: { templateName, templateVars, headerImageUrl },
  });
  res.json(c);
});

/**
 * Reinicia o envio: volta os contatos ENVIADO/FALHA para PENDENTE e zera os
 * contadores — permite reenviar a campanha (ex.: depois de vincular um template
 * às que "não dispararam" por terem ido como texto livre fora da janela de 24h).
 */
export const resetContacts = asyncHandler(async (req, res) => {
  const campaignId = req.params.id;
  const campaign = await prisma.broadcastCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError('Campanha não encontrada', 404);
  await prisma.broadcastContact.updateMany({
    where: { campaignId, status: { in: ['ENVIADO', 'FALHA'] } },
    data: { status: 'PENDENTE', error: null, sentAt: null },
  });
  const total = await prisma.broadcastContact.count({ where: { campaignId } });
  const c = await prisma.broadcastCampaign.update({
    where: { id: campaignId },
    data: { sentCount: 0, failedCount: 0, pendingCount: total, status: 'RASCUNHO' },
  });
  res.json({ ok: true, pending: total, status: c.status });
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
