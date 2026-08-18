import { Router } from 'express';
import * as bc from '../controllers/broadcast.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

r.get('/templates', authorize('LIDER', 'MEMBRO'), bc.templates);
r.get('/', authorize('LIDER', 'MEMBRO'), bc.list);
r.get('/:id', authorize('LIDER', 'MEMBRO'), bc.get);
r.post('/', authorize('LIDER', 'MEMBRO'), bc.create);
r.post('/:id/contacts', authorize('LIDER', 'MEMBRO'), bc.importContacts);
r.post('/:id/send', authorize('LIDER'), bc.send);
r.post('/:id/pause', authorize('LIDER', 'MEMBRO'), bc.pause);
r.delete('/:id', authorize('LIDER'), bc.remove);

export default r;
