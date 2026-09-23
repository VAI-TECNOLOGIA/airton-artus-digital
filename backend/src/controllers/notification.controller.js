import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { audit } from '../utils/audit.js';
import { notifyUsers, resolveTargetUserIds } from '../services/push.service.js';

// ============================================================
//  Módulo de notificações (sino in-app + envio manual + push).
// ============================================================

/** Minhas notificações (sino) — últimas 50 + contagem de não lidas. */
export const mine = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    prisma.appNotification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.appNotification.count({ where: { userId: req.user.id, readAt: null } }),
  ]);
  res.json({ data: items, unread });
});

/** Marca como lida: {id} para uma, ou {all:true} para todas. */
export const markRead = asyncHandler(async (req, res) => {
  if (req.body?.all) {
    await prisma.appNotification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (req.body?.id) {
    await prisma.appNotification.updateMany({
      where: { id: req.body.id, userId: req.user.id },
      data: { readAt: new Date() },
    });
  }
  const unread = await prisma.appNotification.count({ where: { userId: req.user.id, readAt: null } });
  res.json({ ok: true, unread });
});

const sendSchema = z.object({
  mode: z.enum(['all', 'roles', 'users']),
  userIds: z.array(z.string()).optional(),
  roles: z.array(z.enum(['LIDER', 'MEMBRO', 'PARCEIRO'])).optional(),
  title: z.string().min(2).max(80),
  body: z.string().min(2).max(400),
  link: z.string().max(200).nullable().optional(),
});

/** Envio manual de notificação (tela "Enviar notificação"). Só LIDER. */
export const send = asyncHandler(async (req, res) => {
  const data = sendSchema.parse(req.body);
  if (data.mode === 'users' && !data.userIds?.length) throw new AppError('Selecione pelo menos um destinatário.', 400);
  if (data.mode === 'roles' && !data.roles?.length) throw new AppError('Selecione pelo menos um perfil.', 400);

  const result = await notifyUsers(
    { mode: data.mode, userIds: data.userIds, roles: data.roles },
    { title: data.title, body: data.body, kind: 'manual', link: data.link || null },
  );

  await audit({
    userId: req.user.id,
    action: 'SEND',
    entity: 'AppNotification',
    changes: { mode: data.mode, recipients: result.recipients, push: result.push, title: data.title },
    ip: req.ip,
  });

  res.json({ ok: true, ...result });
});

/**
 * Destinatários possíveis + saúde de push (quem tem aparelho registrado).
 * Alimenta o seletor e o selo iPhone/Android da tela de envio. Só LIDER.
 */
export const recipients = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true, deviceTokens: { select: { platform: true } } },
    orderBy: { name: 'asc' },
  });
  const data = users.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    platforms: [...new Set(u.deviceTokens.map((d) => d.platform))],
    hasDevice: u.deviceTokens.length > 0,
  }));
  const health = {
    total: data.length,
    withDevice: data.filter((u) => u.hasDevice).length,
    android: data.filter((u) => u.platforms.includes('android')).length,
    ios: data.filter((u) => u.platforms.includes('ios')).length,
    web: data.filter((u) => u.platforms.includes('web')).length,
  };
  res.json({ data, health });
});
