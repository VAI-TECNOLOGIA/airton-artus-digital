import prisma from '../config/prisma.js';
import env from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';
import { onlyDigits } from '../utils/helpers.js';

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
