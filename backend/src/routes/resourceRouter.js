import { Router } from 'express';
import { authorize } from '../middlewares/rbac.js';

/** Monta um router REST padrão (list/get/create/update/delete) a partir de um crudFactory. */
export function resourceRouter(factory, { writeRoles = [], readRoles = [] } = {}) {
  const r = Router();
  const read = readRoles.length ? [authorize(...readRoles)] : [];
  const write = writeRoles.length ? [authorize(...writeRoles)] : [];

  r.get('/', ...read, factory.list);
  r.get('/:id', ...read, factory.get);
  r.post('/', ...write, factory.create);
  r.put('/:id', ...write, factory.update);
  r.patch('/:id', ...write, factory.update);
  r.delete('/:id', ...write, factory.remove);

  return r;
}
