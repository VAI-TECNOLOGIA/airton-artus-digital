import { Router } from 'express';
import * as user from '../controllers/user.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

r.get('/', authorize('LIDER', 'MEMBRO'), user.list);
r.post('/', authorize('LIDER'), user.create);
r.put('/:id', authorize('LIDER'), user.update);
r.delete('/:id', authorize('LIDER'), user.remove);

export default r;
