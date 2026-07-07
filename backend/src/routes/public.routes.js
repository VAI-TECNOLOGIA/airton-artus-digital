import { Router } from 'express';
import * as pub from '../controllers/public.controller.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const r = Router();

r.get('/stats', pub.stats);
r.get('/campaign', pub.campaign);
// Cadastro público: 5 envios/min por IP (por instância) — corta rajada de bot.
r.post('/join', rateLimit({ windowMs: 60_000, max: 5 }), pub.join);

export default r;
