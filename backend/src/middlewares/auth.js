import prisma from '../config/prisma.js';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Valida o JWT do header Authorization e injeta req.user. */
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Token não fornecido', 401);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('Token inválido ou expirado', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      regionId: true,
      managerId: true,
      active: true,
      avatarUrl: true,
    },
  });

  if (!user || !user.active) throw new AppError('Usuário inválido ou inativo', 401);

  req.user = user;
  next();
});
