import { Router } from 'express';
import * as mr from '../controllers/materialRequest.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

r.get('/', authorize('LIDER', 'MEMBRO', 'PARCEIRO'), mr.list);
r.get('/history/:userId', authorize('LIDER', 'MEMBRO'), mr.requesterHistory);
r.post('/', authorize('LIDER', 'MEMBRO', 'PARCEIRO'), mr.create);
r.patch('/:id/status', authorize('LIDER', 'MEMBRO'), mr.updateStatus);
r.put('/:id', authorize('LIDER', 'MEMBRO'), mr.update);
r.delete('/:id', authorize('LIDER'), mr.remove);

export default r;
