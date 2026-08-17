import prisma from '../config/prisma.js';
import env from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';
import { onlyDigits } from '../utils/helpers.js';
import {
  optOutByPhone,
  createDeletionRequest,
  confirmDeletionRequest,
  hasPendingDeletionRequest,
} from '../services/privacy.service.js';

/** Verificação do webhook (handshake exigido pela Meta Cloud API). */
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === env.whatsapp.verifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
};

/** Recebe eventos do WhatsApp (estrutura compatível com a Meta Cloud API). */
export const receiveWebhook = asyncHandler(async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;

    // Status de entrega (sent/delivered/read/failed). Loga as FALHAS com o código
    // da Meta para diagnosticar quando "diz enviado mas não chega".
    for (const st of value?.statuses || []) {
      if (st.status === 'failed') {
        const err = st.errors?.[0] || {};
        console.warn(
          `[whatsapp:status] FALHA -> ${st.recipient_id} | code ${err.code} | ${err.title || err.message || ''} | ${err.error_data?.details || ''}`,
        );
      }
    }

    const message = value?.messages?.[0];
    if (message) {
      await handleInbound({
        phone: onlyDigits(message.from),
        name: value?.contacts?.[0]?.profile?.name,
        body: message.text?.body || '',
      });
    }
  } catch (e) {
    console.warn('[whatsapp:webhook] erro ao processar:', e.message);
  }
  res.sendStatus(200);
});

/** Simula uma mensagem recebida — permite testar o fluxo sem a API real. */
export const simulateInbound = asyncHandler(async (req, res) => {
  const { phone, name, body } = req.body;
  const result = await handleInbound({ phone: onlyDigits(phone), name, body });
  res.json(result);
});

async function handleInbound({ phone, name, body }) {
  if (!phone) return { ignored: true };

  const supporter = await prisma.supporter.findFirst({ where: { phone } });
  let convo = await prisma.conversation.findFirst({
    where: { contactPhone: phone, status: { not: 'FECHADA' } },
    orderBy: { createdAt: 'desc' },
  });
  if (!convo) {
    convo = await prisma.conversation.create({
      data: {
        channel: 'WHATSAPP',
        status: 'ABERTA',
        contactName: name || supporter?.name || null,
        contactPhone: phone,
        supporterId: supporter?.id || null,
        lastMessageAt: new Date(),
      },
    });
  }

  await prisma.message.create({
    data: { conversationId: convo.id, direction: 'INBOUND', body: body || '', channel: 'WHATSAPP' },
  });
  await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });

  // LGPD: "EXCLUIR MEUS DADOS" inicia a exclusão total — manda um código de
  // confirmação pro próprio número (evita exclusão por engano ou por terceiros).
  if (/^\s*excluir(\s+meus)?\s+dados\b/i.test(body || '')) {
    const code = await createDeletionRequest(phone, { ip: null });
    const reply = code
      ? `Recebemos seu pedido de exclusão de dados. Pra confirmar, responda com o código: *${code}* (válido por 15 minutos). Se não foi você, ignore.`
      : 'Este número não possui cadastro na nossa base. Nada a excluir. 👍';
    const r = await sendWhatsApp({ to: phone, body: reply });
    await prisma.message.create({
      data: { conversationId: convo.id, direction: 'OUTBOUND', body: reply, channel: 'WHATSAPP', externalId: r.id },
    });
    return { conversationId: convo.id, supporterId: supporter?.id || null, deletionRequested: Boolean(code) };
  }

  // Código de 6 dígitos com pedido de exclusão pendente = confirmação.
  const codeMatch = (body || '').trim().match(/^(\d{6})$/);
  if (codeMatch && (await hasPendingDeletionRequest(phone))) {
    const summary = await confirmDeletionRequest(phone, codeMatch[1], { requestedBy: 'titular (whatsapp)' });
    if (summary) {
      // Despedida ANTES da exclusão efetiva já ter removido a conversa — o
      // confirmDeletionRequest apaga a convo, então só enviamos o WhatsApp.
      await sendWhatsApp({
        to: phone,
        body: 'Confirmado. Seus dados foram excluídos permanentemente da base da pré-campanha. Obrigado por ter caminhado conosco. 👋',
      });
      return { deleted: true };
    }
    const reply = 'Código inválido ou expirado. Responda EXCLUIR MEUS DADOS pra receber um novo código.';
    const r = await sendWhatsApp({ to: phone, body: reply });
    await prisma.message.create({
      data: { conversationId: convo.id, direction: 'OUTBOUND', body: reply, channel: 'WHATSAPP', externalId: r.id },
    });
    return { conversationId: convo.id, deletionConfirmed: false };
  }

  // LGPD: "SAIR" (e variações) = revogação do consentimento de mensagens.
  // Marca opt-out, confirma pro titular e encerra o fluxo — nada mais é enviado.
  if (/^\s*(sair|parar|cancelar|descadastrar|remover)\b/i.test(body || '')) {
    await optOutByPhone(phone);
    const bye =
      'Pronto! Você não receberá mais mensagens da pré-campanha. ' +
      'Se quiser também EXCLUIR seus dados da nossa base, responda EXCLUIR MEUS DADOS ou acesse a página de privacidade no nosso site.';
    const r = await sendWhatsApp({ to: phone, body: bye });
    await prisma.message.create({
      data: { conversationId: convo.id, direction: 'OUTBOUND', body: bye, channel: 'WHATSAPP', externalId: r.id },
    });
    await prisma.conversation.update({ where: { id: convo.id }, data: { status: 'FECHADA' } });
    return { conversationId: convo.id, supporterId: supporter?.id || null, optOut: true };
  }

  if (supporter && /^\s*sim\b/i.test(body || '')) {
    const v = await prisma.volunteer.findUnique({ where: { supporterId: supporter.id } });
    if (v && !v.confirmed) {
      await prisma.volunteer.update({
        where: { id: v.id },
        data: { confirmed: true, confirmedAt: new Date(), confirmationChannel: 'WHATSAPP', active: true },
      });
      await prisma.supporter.update({ where: { id: supporter.id }, data: { status: 'CONFIRMADO' } });
      const ask =
        'Que ótimo! 🎉 Como você prefere ajudar? Responda: (1) Caminhadas (2) Faixa em casa (3) Material digital (4) Eventos';
      const r = await sendWhatsApp({ to: phone, body: ask });
      await prisma.message.create({
        data: { conversationId: convo.id, direction: 'OUTBOUND', body: ask, channel: 'WHATSAPP', externalId: r.id },
      });
    }
  }

  return { conversationId: convo.id, supporterId: supporter?.id || null };
}
