import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendViaChannel } from '../services/messaging.service.js';

const include = {
  agent: { select: { id: true, name: true } },
  supporter: { select: { id: true, name: true } },
};

export const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.channel) where.channel = req.query.channel;
  if (req.query.mine === 'true') where.agentId = req.user.id;
  const data = await prisma.conversation.findMany({
    where,
    include: { ...include, _count: { select: { messages: true } } },
    orderBy: { lastMessageAt: 'desc' },
    take: 200,
  });
  res.json({ data });
});

export const get = asyncHandler(async (req, res) => {
  const c = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { ...include, messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true } } } } },
  });
  if (!c) throw new AppError('Conversa não encontrada', 404);
  res.json(c);
});

export const reply = asyncHandler(async (req, res) => {
  const { body } = z.object({ body: z.string().min(1, 'Mensagem vazia') }).parse(req.body);
  const convo = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!convo) throw new AppError('Conversa não encontrada', 404);

  const result = await sendViaChannel(convo.channel, { to: convo.contactPhone, body });
  const msg = await prisma.message.create({
    data: {
      conversationId: convo.id,
      direction: 'OUTBOUND',
      body,
      channel: convo.channel,
      senderId: req.user?.id,
      externalId: result.id,
    },
  });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date(), status: 'EM_ATENDIMENTO', agentId: convo.agentId || req.user?.id },
  });
  res.status(201).json(msg);
});

export const update = asyncHandler(async (req, res) => {
  const { status, agentId, tags, notes } = req.body;
  const c = await prisma.conversation.update({
    where: { id: req.params.id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(agentId !== undefined ? { agentId: agentId || null } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
    include,
  });
  res.json(c);
});

export const assignMe = asyncHandler(async (req, res) => {
  const c = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { agentId: req.user.id, status: 'EM_ATENDIMENTO' },
    include,
  });
  res.json(c);
});
