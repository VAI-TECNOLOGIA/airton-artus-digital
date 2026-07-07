import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const memberSelect = { user: { select: { id: true, name: true, role: true, code: true, avatarUrl: true } } };

/** Diretório de membros internos (para localizar por nome/código). */
export const users = asyncHandler(async (req, res) => {
  const data = await prisma.user.findMany({
    where: { active: true, role: { in: ['LIDER', 'MEMBRO'] } },
    select: { id: true, name: true, role: true, code: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  });
  res.json({ data });
});

/** Lista as conversas internas do usuário logado, por tipo (com não-lidas). */
export const listThreads = asyncHandler(async (req, res) => {
  const type = req.query.type; // DIRECT | GROUP | CAMPAIGN
  const me = req.user.id;
  const threads = await prisma.internalThread.findMany({
    where: { ...(type ? { type } : {}), members: { some: { userId: me } } },
    include: {
      members: { select: { ...memberSelect, lastReadAt: true, userId: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  // calcula não-lidas por conversa (mensagens de outros após meu lastReadAt)
  const data = await Promise.all(
    threads.map(async (t) => {
      const mine = t.members.find((m) => m.userId === me);
      const unread = await prisma.internalMessage.count({
        where: {
          threadId: t.id,
          senderId: { not: me },
          ...(mine?.lastReadAt ? { createdAt: { gt: mine.lastReadAt } } : {}),
        },
      });
      return { ...t, unread };
    })
  );
  res.json({ data });
});

/** Detalhe da conversa interna + mensagens. */
export const getThread = asyncHandler(async (req, res) => {
  const t = await prisma.internalThread.findUnique({
    where: { id: req.params.id },
    include: {
      members: { select: memberSelect },
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true } } } },
    },
  });
  if (!t) throw new AppError('Conversa não encontrada', 404);
  if (!t.members.some((m) => m.user.id === req.user.id)) throw new AppError('Acesso negado', 403);
  // marca como lida para o usuário atual
  await prisma.internalMember.updateMany({
    where: { threadId: t.id, userId: req.user.id },
    data: { lastReadAt: new Date() },
  });
  res.json(t);
});

/** Cria grupo ou campanha interna. */
export const createThread = asyncHandler(async (req, res) => {
  const { type, name, memberIds } = z
    .object({
      type: z.enum(['GROUP', 'CAMPAIGN']),
      name: z.string().min(2),
      memberIds: z.array(z.string()).default([]),
    })
    .parse(req.body);

  const ids = Array.from(new Set([req.user.id, ...memberIds]));
  const t = await prisma.internalThread.create({
    data: {
      type,
      name,
      createdById: req.user.id,
      members: { create: ids.map((userId) => ({ userId })) },
    },
    include: { members: { select: memberSelect } },
  });
  res.status(201).json(t);
});

/** Abre (ou reutiliza) uma conversa direta com outro membro. */
export const directThread = asyncHandler(async (req, res) => {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  if (userId === req.user.id) throw new AppError('Não é possível conversar consigo mesmo', 400);

  const existing = await prisma.internalThread.findFirst({
    where: {
      type: 'DIRECT',
      AND: [{ members: { some: { userId: req.user.id } } }, { members: { some: { userId } } }],
    },
    include: { members: { select: memberSelect } },
  });
  if (existing) return res.json(existing);

  const t = await prisma.internalThread.create({
    data: {
      type: 'DIRECT',
      createdById: req.user.id,
      members: { create: [{ userId: req.user.id }, { userId }] },
    },
    include: { members: { select: memberSelect } },
  });
  res.status(201).json(t);
});

/** Envia mensagem interna (texto e/ou imagem anexada). */
export const postMessage = asyncHandler(async (req, res) => {
  const { body, attachmentUrl } = z
    .object({
      body: z.string().default(''),
      // imagem como data URL (até ~2MB) ou link http(s)
      attachmentUrl: z
        .string()
        .max(2_800_000)
        .refine((v) => /^data:image\/(png|jpe?g|gif|webp);base64,/.test(v) || /^https?:\/\//.test(v), 'Anexo inválido')
        .optional(),
    })
    .parse(req.body);

  if (!body.trim() && !attachmentUrl) throw new AppError('Mensagem vazia', 400);

  const t = await prisma.internalThread.findUnique({ where: { id: req.params.id }, include: { members: true } });
  if (!t) throw new AppError('Conversa não encontrada', 404);
  if (!t.members.some((m) => m.userId === req.user.id)) throw new AppError('Acesso negado', 403);

  const msg = await prisma.internalMessage.create({
    data: { threadId: t.id, senderId: req.user.id, body: body || '', attachmentUrl: attachmentUrl || null },
    include: { sender: { select: { id: true, name: true } } },
  });
  await prisma.internalThread.update({ where: { id: t.id }, data: { lastMessageAt: new Date() } });
  res.status(201).json(msg);
});
