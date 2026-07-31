import { Router } from 'express';
import * as pub from '../controllers/public.controller.js';
import * as rsvp from '../controllers/rsvp.controller.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const r = Router();

r.get('/stats', pub.stats);
r.get('/campaign', pub.campaign);
// Cadastro público: 5 envios/min por IP (por instância) — corta rajada de bot.
r.post('/join', rateLimit({ windowMs: 60_000, max: 5 }), pub.join);

// LGPD: exclusão de dados pelo titular (código via WhatsApp). Limites apertados
// pra impedir spam de códigos e força-bruta do código de 6 dígitos.
r.post('/data-deletion/request', rateLimit({ windowMs: 60_000, max: 3 }), pub.requestDataDeletion);
r.post('/data-deletion/confirm', rateLimit({ windowMs: 60_000, max: 5 }), pub.confirmDataDeletion);

// Lista de convidados (RSVP público, sem login)
r.get('/rsvp/:token', rsvp.publicGet);
r.post('/rsvp/:token', rateLimit({ windowMs: 60_000, max: 8 }), rsvp.publicRespond);

export default r;
