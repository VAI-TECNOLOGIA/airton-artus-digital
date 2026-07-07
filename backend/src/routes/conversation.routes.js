import { Router } from 'express';
import * as conv from '../controllers/conversation.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

r.get('/', authorize('LIDER', 'MEMBRO'), conv.list);
r.get('/:id', authorize('LIDER', 'MEMBRO'), conv.get);
r.post('/:id/reply', authorize('LIDER', 'MEMBRO'), conv.reply);
r.post('/:id/assign', authorize('LIDER', 'MEMBRO'), conv.assignMe);
r.put('/:id', authorize('LIDER', 'MEMBRO'), conv.update);

export default r;
