import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { runAutomations } from '../services/automation.service.js';

// ============================================================
//  Rotas de cron (Vercel Cron Jobs).
//  A Vercel chama GET com header "Authorization: Bearer ${CRON_SECRET}"
//  quando a env CRON_SECRET existe no projeto. Sem o secret correto → 401.
// ============================================================

const r = Router();

function requireCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError('CRON_SECRET não configurado', 503);
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${secret}`) throw new AppError('Não autorizado', 401);
}

r.get('/automations', asyncHandler(async (req, res) => {
  requireCronSecret(req);
  const result = await runAutomations();
  console.log('[cron:automations]', JSON.stringify(result));
  res.json({ ok: true, ...result });
}));

export default r;
