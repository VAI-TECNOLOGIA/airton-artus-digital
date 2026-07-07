import { Router } from 'express';
import * as internal from '../controllers/internal.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

// Chat interno: apenas equipe (LÍDER e MEMBRO). Parceiros (externos) não acessam.
r.use(authorize('LIDER', 'MEMBRO'));

r.get('/users', internal.users);
r.get('/threads', internal.listThreads);
r.get('/threads/:id', internal.getThread);
r.post('/threads', internal.createThread);
r.post('/direct', internal.directThread);
r.post('/threads/:id/messages', internal.postMessage);

export default r;
