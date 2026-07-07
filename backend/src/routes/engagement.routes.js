import { Router } from 'express';
import * as engagement from '../controllers/engagement.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

r.get('/', authorize('LIDER', 'MEMBRO', 'PARCEIRO'), engagement.list);
r.post('/', authorize('LIDER', 'MEMBRO', 'PARCEIRO'), engagement.create);
r.post('/:id/validate', authorize('LIDER', 'MEMBRO'), engagement.validate);

export default r;
