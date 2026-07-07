import { Router } from 'express';
import * as wa from '../controllers/whatsapp.controller.js';
import { authenticate } from '../middlewares/auth.js';

const r = Router();

// Públicos — chamados pela Meta Cloud API (sem nosso JWT).
r.get('/webhook', wa.verifyWebhook);
r.post('/webhook', wa.receiveWebhook);

// Protegido — simula uma mensagem recebida para testar o fluxo de confirmação.
r.post('/simulate', authenticate, wa.simulateInbound);

export default r;
