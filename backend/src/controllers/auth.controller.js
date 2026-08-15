import { z } from 'zod';
import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken, signResetToken, verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';
import { USER_ROLES } from '../utils/enums.js';
import { nullifyEmpty, onlyDigits } from '../utils/helpers.js';
import { sendEmail, resetPasswordEmail } from '../services/email.service.js';
import { notifyPasswordReset } from '../services/whatsappTemplates.service.js';
import { brDigits } from '../utils/helpers.js';
import { linkCityByName, fallbackLatLng } from '../utils/geo.js';
import env from '../config/env.js';

const loginSchema = z.object({
  email: z.string().min(3, 'Informe e-mail ou telefone'), // aceita e-mail OU telefone
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

const signupSchema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Informe um telefone válido'),
  cityName: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
});

function publicUser(u) {
  if (!u) return null;
  const { password, resetToken, resetTokenExpires, ...rest } = u;
  return rest;
}

export const login = asyncHandler(async (req, res) => {
  const { email: identifier, password } = loginSchema.parse(req.body);
  const user = identifier.includes('@')
    ? await prisma.user.findUnique({ where: { email: identifier.toLowerCase() }, include: { region: true } })
    : await prisma.user.findFirst({ where: { phone: brDigits(identifier) }, include: { region: true } });
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

/**
 * Cadastro PÚBLICO (autoatendimento): qualquer pessoa cria a própria conta e já
 * entra logada como Apoiador (PARCEIRO). Também é registrada na base de Apoiadores
 * (com antifraude de telefone). Depois, um administrador pode promover o perfil
 * (Membro/Líder) em Usuários.
 */
export const signup = asyncHandler(async (req, res) => {
  const data = signupSchema.parse(nullifyEmpty(req.body));
  const email = data.email.toLowerCase();
  const phone = onlyDigits(data.phone);

  // anti-bot: limita o total de contas criadas por minuto (vale entre lambdas)
  const recent = await prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent >= 60) throw new AppError('Estamos recebendo muitos cadastros agora. Tente novamente em instantes.', 429);

  if (await prisma.user.findUnique({ where: { email } })) {
    throw new AppError('Este e-mail já tem uma conta. Faça login ou use "Esqueci minha senha".', 409);
  }
  const black = await prisma.blacklist.findFirst({ where: { phone } });
  if (black) throw new AppError('Não foi possível criar a conta com este número de telefone.', 403);

  // conta de acesso — todo mundo começa como Apoiador (PARCEIRO)
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      phone,
      role: 'PARCEIRO',
      active: true,
      password: await hashPassword(data.password),
    },
  });

  // registra também na base de Apoiadores (antifraude de telefone duplicado)
  try {
    let status = 'NOVO';
    let flaggedReason = null;
    let duplicateOfId = null;
    const existing = await prisma.supporter.findFirst({ where: { phone } });
    if (existing) {
      status = 'SUSPEITO';
      flaggedReason = `Telefone duplicado — já cadastrado para "${existing.name}".`;
      duplicateOfId = existing.id;
      await prisma.supporter.update({
        where: { id: existing.id },
        data: { status: 'SUSPEITO', flaggedReason: 'Telefone usado em mais de um cadastro.' },
      });
    }
    const cityName = data.cityName || 'Porto Alegre';
    const city = await linkCityByName(prisma, cityName);
    const geo = fallbackLatLng({ cityName, neighborhood: data.neighborhood, seed: phone });
    await prisma.supporter.create({
      data: {
        name: data.name,
        phone,
        whatsapp: phone,
        email,
        neighborhood: data.neighborhood || null,
        cityName,
        cityId: city?.id || null,
        regionId: city?.regionId || null,
        lat: geo.lat,
        lng: geo.lng,
        supportType: 'NOTICIAS',
        status,
        flaggedReason,
        duplicateOfId,
      },
    });
  } catch (e) {
    console.error('[signup] conta criada, mas falhou ao registrar na base:', e.message);
  }

  const token = signToken({ sub: user.id, role: user.role });
  await audit({ userId: user.id, action: 'SIGNUP', entity: 'User', entityId: user.id, ip: req.ip });
  res.status(201).json({ token, user: publicUser(user) });
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

    // Também envia pelo template OFICIAL de WhatsApp (best-effort) se houver telefone.
    await notifyPasswordReset({ name: user.name, phone: user.phone, token });

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

  // Exigência das lojas (Apple 5.1.1v / Google): QUALQUER conta logada pode
  // excluir a si mesma, sem trava de papel. A senha já é a confirmação.

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
