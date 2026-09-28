import { Router } from 'express';
import { authorize } from '../middlewares/rbac.js';
import * as nc from '../controllers/notification.controller.js';

// Montado sob /notifications, já dentro do bloco autenticado (index.js).
const r = Router();

// Sino — qualquer usuário logado vê as próprias notificações.
r.get('/', nc.mine);
r.post('/read', nc.markRead);

// Envio manual + saúde de destinatários — só Líder.
r.get('/recipients', authorize('LIDER'), nc.recipients);
r.post('/send', authorize('LIDER'), nc.send);

export default r;
