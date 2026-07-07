import { Router } from 'express';
import * as supporter from '../controllers/supporter.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

r.get('/suspects', authorize('LIDER'), supporter.listSuspects);
r.get('/', authorize('LIDER', 'MEMBRO'), supporter.list);
r.get('/:id', authorize('LIDER', 'MEMBRO'), supporter.get);
r.post('/', authorize('LIDER', 'MEMBRO'), supporter.create);
r.post('/:id/confirm', authorize('LIDER', 'MEMBRO'), supporter.confirmVolunteer);
r.post('/:id/blacklist', authorize('LIDER', 'MEMBRO'), supporter.toBlacklist);
r.put('/:id', authorize('LIDER', 'MEMBRO'), supporter.update);
r.delete('/:id', authorize('LIDER'), supporter.remove);

export default r;
