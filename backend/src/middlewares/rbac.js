import { AppError } from '../utils/AppError.js';

/** Autoriza o acesso à rota apenas para os perfis informados. */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new AppError('Não autenticado', 401));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new AppError('Acesso negado para o seu perfil', 403));
    }
    next();
  };
