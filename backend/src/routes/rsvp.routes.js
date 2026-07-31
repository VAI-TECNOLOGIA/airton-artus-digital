import { Router } from 'express';
import * as rsvp from '../controllers/rsvp.controller.js';
import { authorize } from '../middlewares/rbac.js';

// Endpoints autenticados da lista de convidados, montados sob /events.
// Precisam vir ANTES do CRUD genérico de /events no index para casar /:id/guests.
const r = Router();

r.get('/:id/guests', authorize('LIDER', 'MEMBRO'), rsvp.listGuests);
r.delete('/:id/guests/:guestId', authorize('LIDER', 'MEMBRO'), rsvp.removeGuest);

export default r;
