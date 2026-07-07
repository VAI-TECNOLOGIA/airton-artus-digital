import { Router } from 'express';
import * as settings from '../controllers/settings.controller.js';
import { authorize } from '../middlewares/rbac.js';

const r = Router();

r.get('/', settings.getAll);
r.get('/roles', settings.listRoles);
r.get('/:key', settings.get);
r.put('/:key', authorize('LIDER'), settings.upsert);

export default r;
