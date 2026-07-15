import { z } from 'zod';
import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken, signResetToken, verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';
import { USER_ROLES } from '../utils/enums.js';
import { nullifyEmpty } from '../utils/helpers.js';
import { sendEmail, resetPasswordEmail } from '../services/email.service.js';
import env from '../config/env.js';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  role: z.enum(USER_ROLES).optional(),
  regionId: z.string().uuid().nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
});

function publicUser(u) {
  if (!u) return null;
  const { password, resetToken, resetTokenExpires, ...rest } = u;
  return rest;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { region: true },
  });
  if (!user || !(await comparePassword(password, user.password))) {
    throw new AppError('Credenciais inválidas', 401);
  }
  if (!user.active) throw new AppError('Usuário inativo', 403);

  const token = signToken({ sub: user.id, role: user.role });
  await audit({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ip: req.ip });
  res.json({ token, user: publicUser(user) });
});

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(nullifyEmpty(req.body));
  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) throw new AppError('E-mail já cadastrado', 409);

  const user = await prisma.user.create({
    data: {
      ...data,
      email: data.email.toLowerCase(),
      password: await hashPassword(data.password),
    },
  });
  await audit({ userId: req.user?.id, action: 'CREATE', entity: 'User', entityId: user.id, ip: req.ip });
  res.status(201).json(publicUser(user));
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { region: true },
  });
  res.json(publicUser(user));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const message = 'Se o e-mail existir, enviaremos instruções de recuperação.';

  if (user) {
    const token = signResetToken({ sub: user.id });
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: new Date(Date.now() + 3600_000) },
    });

    // Link aponta pro próprio front (mesma origem do deploy). Fallback: PUBLIC_URL.
    const base = req.headers.origin || env.publicUrl;
    const resetUrl = `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
    try {
      const { subject, html } = resetPasswordEmail({ name: user.name, resetUrl });
      await sendEmail({ to: user.email, subject, html });
    } catch (e) {
      // Não vaza a falha pro solicitante (evita enumeração); loga pra operação.
      console.error('[forgot-password] falha ao enviar e-mail:', e.message);
    }

    return res.json({
      message,
      resetToken: process.env.NODE_ENV === 'development' ? token : undefined,
    });
  }
  res.json({ message });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = z
    .object({ token: z.string(), password: z.string().min(6) })
    .parse(req.body);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('Token inválido ou expirado', 400);
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.resetToken !== token) throw new AppError('Token inválido', 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(password), resetToken: null, resetTokenExpires: null },
  });
  res.json({ message: 'Senha redefinida com sucesso.' });
});

// LGPD/lojas de app: o próprio usuário exclui sua conta, com confirmação de
// senha. Relações apontam pra ele com onDelete: SetNull (histórico fica
// anonimizado) e o JWT morre na hora — o authenticate consulta o banco.
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = z.object({ password: z.string().min(1, 'Senha obrigatória') }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await comparePassword(password, user.password))) {
    throw new AppError('Senha incorreta', 400);
  }

  if (user.role === 'LIDER') {
    const otherLeaders = await prisma.user.count({
      where: { role: 'LIDER', active: true, id: { not: user.id } },
    });
    if (otherLeaders === 0) {
      throw new AppError(
        'Você é o único Líder ativo. Promova outro usuário a Líder antes de excluir sua conta.',
        400
      );
    }
  }

  // Auditoria antes do delete: o userId vira null em cascata (SetNull),
  // então o registro fica sem vínculo com a pessoa — só a trilha do evento.
  await audit({
    userId: user.id,
    action: 'DELETE_ACCOUNT_SELF',
    entity: 'User',
    entityId: user.id,
    changes: { role: user.role },
    ip: req.ip,
  });
  await prisma.user.delete({ where: { id: user.id } });

  res.json({ message: 'Conta excluída permanentemente.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string(), newPassword: z.string().min(6) })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await comparePassword(currentPassword, user.password))) {
    throw new AppError('Senha atual incorreta', 400);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });
  res.json({ message: 'Senha alterada com sucesso.' });
});
