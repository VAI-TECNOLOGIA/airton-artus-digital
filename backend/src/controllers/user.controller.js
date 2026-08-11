import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword } from '../utils/password.js';
import { USER_ROLES } from '../utils/enums.js';
import { nullifyEmpty } from '../utils/helpers.js';
import { notifyPasswordReset } from '../services/whatsappTemplates.service.js';
import { signResetToken } from '../utils/jwt.js';

const select = {
  id: true, name: true, email: true, role: true, phone: true, active: true,
  avatarUrl: true, regionId: true, managerId: true,
  region: { select: { name: true } }, createdAt: true,
};

export const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: 'insensitive' } },
      { email: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }
  const data = await prisma.user.findMany({ where, select, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(USER_ROLES),
  phone: z.string().nullable().optional(),
  regionId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

export const create = asyncHandler(async (req, res) => {
  const data = createSchema.parse(nullifyEmpty(req.body));
  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) throw new AppError('E-mail já cadastrado', 409);
  // Senha opcional: se o admin não definir, gera uma aleatória — a pessoa cria a própria pelo link.
  const rawPassword = data.password || `${Math.random().toString(36).slice(2, 10)}Aa1!`;
  const user = await prisma.user.create({
    data: { ...data, email: data.email.toLowerCase(), password: await hashPassword(rawPassword) },
    select,
  });
  // Acesso liberado → gera link de "Definir senha" e envia por WhatsApp (best-effort).
  try {
    const token = signResetToken({ sub: user.id });
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: new Date(Date.now() + 48 * 3600_000) },
    });
    await notifyPasswordReset({ name: user.name, phone: user.phone, token });
  } catch (e) {
    console.error('[user:create] falha ao enviar link de acesso:', e.message);
  }
  res.status(201).json(user);
});

export const update = asyncHandler(async (req, res) => {
  const data = nullifyEmpty(req.body);
  ['id', 'region', 'createdAt'].forEach((k) => delete data[k]);
  if (data.password) data.password = await hashPassword(data.password);
  else delete data.password;
  if (data.email) data.email = data.email.toLowerCase();
  const user = await prisma.user.update({ where: { id: req.params.id }, data, select });
  res.json(user);
});

export const remove = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new AppError('Você não pode remover o próprio usuário', 400);
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
