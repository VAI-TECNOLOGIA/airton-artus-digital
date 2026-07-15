import crypto from 'node:crypto';
import prisma from '../config/prisma.js';

// ============================================================
//  LGPD — exclusão de dados do apoiador e utilitários de
//  verificação por código (prova de posse do telefone).
//
//  A exclusão não é só o DELETE do Supporter: telefone/nome são
//  copiados em Conversation, BroadcastContact, BannerLocation e
//  AutomationLog — tudo precisa ser removido ou anonimizado.
//  O que fica (anonimizado): logs de automação (idempotência) e
//  AuditLog do próprio pedido, como trilha do atendimento LGPD.
// ============================================================

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/** Código numérico de 6 dígitos criptograficamente aleatório. */
export function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/** Telefone mascarado pra logs/auditoria: 5199998877 → 51*****877 */
export function maskPhone(phone = '') {
  const p = String(phone);
  return p.length > 5 ? `${p.slice(0, 2)}${'*'.repeat(p.length - 5)}${p.slice(-3)}` : '***';
}

/**
 * Exclui TODOS os dados pessoais ligados a um telefone de apoiador.
 * Retorna o resumo do que foi removido/anonimizado.
 */
export async function deleteSupporterDataByPhone(phone, { requestedBy = 'titular', ip = null } = {}) {
  const supporters = await prisma.supporter.findMany({
    where: { OR: [{ phone }, { whatsapp: phone }] },
    select: { id: true, name: true },
  });
  const ids = supporters.map((s) => s.id);
  const anonymizedRecipient = `lgpd:${sha256(phone).slice(0, 12)}`;

  const summary = await prisma.$transaction(async (tx) => {
    // Conversas (e mensagens, em cascata) — conteúdo é dado pessoal.
    const conversations = await tx.conversation.deleteMany({
      where: { OR: [{ contactPhone: phone }, ...(ids.length ? [{ supporterId: { in: ids } }] : [])] },
    });

    // Cópias do contato em campanhas de disparo.
    const broadcastContacts = await tx.broadcastContact.deleteMany({ where: { phone } });

    // Faixas: mantém o registro operacional, remove a identificação.
    const banners = await tx.bannerLocation.updateMany({
      where: { OR: [{ phone }, ...(ids.length ? [{ supporterId: { in: ids } }] : [])] },
      data: { responsibleName: 'Removido (LGPD)', phone: null },
    });

    // Logs de automação: telefone vira hash (mantém idempotência sem PII).
    const automationLogs = await tx.automationLog.updateMany({
      where: { recipient: phone },
      data: { recipient: anonymizedRecipient },
    });

    // Cadastros (Volunteer/histórico/engajamento caem em cascata).
    const deletedSupporters = ids.length
      ? await tx.supporter.deleteMany({ where: { id: { in: ids } } })
      : { count: 0 };

    // Trilha do atendimento LGPD — sem PII (telefone mascarado).
    await tx.auditLog.create({
      data: {
        action: 'LGPD_DATA_DELETION',
        entity: 'Supporter',
        changes: {
          phone: maskPhone(phone),
          requestedBy,
          supporters: deletedSupporters.count,
          conversations: conversations.count,
          broadcastContacts: broadcastContacts.count,
          bannersAnonymized: banners.count,
          automationLogsAnonymized: automationLogs.count,
        },
        ip,
      },
    });

    return {
      supporters: deletedSupporters.count,
      conversations: conversations.count,
      broadcastContacts: broadcastContacts.count,
      bannersAnonymized: banners.count,
      automationLogsAnonymized: automationLogs.count,
    };
  });

  return summary;
}

// ---- Pedido de exclusão com código (compartilhado entre web e WhatsApp) ----

export const DELETION_CODE_TTL_MS = 15 * 60_000;
export const DELETION_MAX_ATTEMPTS = 5;

/**
 * Cria um pedido de exclusão pro telefone (se houver cadastro) e retorna o
 * código a ser enviado ao titular — ou null se o telefone não existe na base.
 */
export async function createDeletionRequest(phone, { ip = null } = {}) {
  const exists = await prisma.supporter.findFirst({
    where: { OR: [{ phone }, { whatsapp: phone }] },
    select: { id: true },
  });
  if (!exists) return null;

  const code = generateCode();
  await prisma.dataDeletionRequest.create({
    data: {
      phone,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + DELETION_CODE_TTL_MS),
      ip,
    },
  });
  return code;
}

/**
 * Valida o código do pedido mais recente do telefone. Se bater, executa a
 * exclusão e retorna o resumo; senão retorna null (e conta a tentativa).
 */
export async function confirmDeletionRequest(phone, code, { requestedBy = 'titular', ip = null } = {}) {
  const request = await prisma.dataDeletionRequest.findFirst({
    where: { phone, confirmedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!request || request.attempts >= DELETION_MAX_ATTEMPTS) return null;

  if (request.codeHash !== sha256(code)) {
    await prisma.dataDeletionRequest.update({
      where: { id: request.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  await prisma.dataDeletionRequest.update({
    where: { id: request.id },
    data: { confirmedAt: new Date() },
  });
  return deleteSupporterDataByPhone(phone, { requestedBy, ip });
}

/** Existe pedido de exclusão pendente (não confirmado, não expirado) pro telefone? */
export async function hasPendingDeletionRequest(phone) {
  const r = await prisma.dataDeletionRequest.findFirst({
    where: { phone, confirmedAt: null, expiresAt: { gte: new Date() } },
    select: { id: true },
  });
  return Boolean(r);
}

/** Marca opt-out de mensagens (comando "SAIR") pra todos os cadastros do telefone. */
export async function optOutByPhone(phone) {
  const r = await prisma.supporter.updateMany({
    where: { OR: [{ phone }, { whatsapp: phone }], optOutAt: null },
    data: { optOutAt: new Date() },
  });
  if (r.count) {
    await prisma.auditLog.create({
      data: { action: 'LGPD_OPT_OUT', entity: 'Supporter', changes: { phone: maskPhone(phone), count: r.count } },
    });
  }
  return r.count;
}

/** Conjunto de telefones opt-out dentro de uma lista (pra filtrar disparos em lote). */
export async function optedOutPhones(phones = []) {
  if (!phones.length) return new Set();
  const rows = await prisma.supporter.findMany({
    where: { optOutAt: { not: null }, OR: [{ phone: { in: phones } }, { whatsapp: { in: phones } }] },
    select: { phone: true, whatsapp: true },
  });
  const set = new Set();
  rows.forEach((r) => {
    if (r.phone) set.add(r.phone);
    if (r.whatsapp) set.add(r.whatsapp);
  });
  return set;
}
