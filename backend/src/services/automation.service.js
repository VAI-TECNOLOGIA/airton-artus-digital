import prisma from '../config/prisma.js';
import { sendViaChannel, renderTemplate } from './messaging.service.js';

// ============================================================
//  Motor de automações — executado 1x/dia pelo Vercel Cron
//  (GET /api/cron/automations, protegido por CRON_SECRET).
//
//  Regras por tipo:
//  - ANIVERSARIO: roda todo dia; alcança apoiadores cujo birthDate
//    (dia/mês) é hoje. Ignora triggerDate.
//  - Demais tipos (NATAL, DIA_AMIGO, LEMBRETE_EVENTO, CONVOCACAO,
//    CONFIRMACAO, AGRADECIMENTO_VOLUNTARIO): disparam quando
//    triggerDate cai HOJE (fuso America/Sao_Paulo).
//
//  Público (campo livre `audience`): contém "volunt" → só voluntários;
//  vazio ou outro texto → todos os apoiadores elegíveis (fora
//  BLACKLIST/SUSPEITO/INATIVO).
//
//  Idempotência: nunca reenvia pro mesmo destinatário no mesmo dia
//  (checagem em AutomationLog). Cap de envios por execução pra caber
//  no tempo de lambda — o que sobrar sai na execução seguinte.
// ============================================================

const MAX_SENDS_PER_RUN = 100;
const ELIGIBLE_STATUS = ['NOVO', 'CONFIRMADO', 'ATIVO', 'PENDENTE'];

function spDate(d = new Date()) {
  // "hoje" no fuso da campanha (America/Sao_Paulo), como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}

function spDayMonth(d = new Date()) {
  const [, m, day] = spDate(d).split('-');
  return { day: Number(day), month: Number(m) };
}

async function eligibleRecipients(audience) {
  const wantsVolunteers = /volunt/i.test(audience || '');
  if (wantsVolunteers) {
    const vols = await prisma.volunteer.findMany({
      include: { supporter: true },
      take: 5000,
    });
    return vols
      .map((v) => v.supporter)
      .filter((s) => s && s.phone && ELIGIBLE_STATUS.includes(s.status));
  }
  return prisma.supporter.findMany({
    where: { status: { in: ELIGIBLE_STATUS }, phone: { not: '' } },
    take: 5000,
  });
}

async function birthdayRecipients() {
  const { day, month } = spDayMonth();
  const all = await prisma.supporter.findMany({
    where: { birthDate: { not: null }, status: { in: ELIGIBLE_STATUS } },
    take: 5000,
  });
  return all.filter((s) => {
    const b = new Date(s.birthDate);
    return b.getUTCDate() === day && b.getUTCMonth() + 1 === month;
  });
}

async function alreadySentToday(automationId, recipientPhone) {
  const today = spDate();
  const start = new Date(`${today}T00:00:00-03:00`);
  const log = await prisma.automationLog.findFirst({
    where: { automationId, recipient: recipientPhone, createdAt: { gte: start } },
    select: { id: true },
  });
  return Boolean(log);
}

/** Executa todas as automações ATIVAS devidas hoje. Retorna resumo por automação. */
export async function runAutomations() {
  const today = spDate();
  const actives = await prisma.automation.findMany({ where: { status: 'ATIVA' } });

  const summary = [];
  let budget = MAX_SENDS_PER_RUN;

  for (const auto of actives) {
    const isBirthday = auto.type === 'ANIVERSARIO';
    const dueToday = isBirthday || (auto.triggerDate && spDate(new Date(auto.triggerDate)) === today);
    if (!dueToday) {
      summary.push({ id: auto.id, name: auto.name, type: auto.type, skipped: 'fora da data' });
      continue;
    }

    const recipients = isBirthday
      ? await birthdayRecipients()
      : await eligibleRecipients(auto.audience);

    let sent = 0;
    let failed = 0;
    let deduped = 0;

    for (const s of recipients) {
      if (budget <= 0) break;
      if (await alreadySentToday(auto.id, s.phone)) { deduped++; continue; }

      const body = renderTemplate(auto.message, {
        nome: s.name?.split(' ')[0] || s.name || '',
        cidade: s.cityName || '',
        bairro: s.neighborhood || '',
        responsavel: '',
      });

      try {
        await sendViaChannel('WHATSAPP', { to: s.phone, body });
        await prisma.automationLog.create({
          data: { automationId: auto.id, recipient: s.phone, channel: 'WHATSAPP', success: true },
        });
        sent++;
      } catch (e) {
        await prisma.automationLog.create({
          data: {
            automationId: auto.id,
            recipient: s.phone,
            channel: 'WHATSAPP',
            success: false,
            detail: String(e.message).slice(0, 300),
          },
        });
        failed++;
      }
      budget--;
    }

    const remaining = Math.max(0, recipients.length - sent - failed - deduped);
    summary.push({ id: auto.id, name: auto.name, type: auto.type, sent, failed, deduped, remaining });
  }

  return { date: today, actives: actives.length, budgetLeft: budget, automations: summary };
}
