import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { registerDeviceToken, unregisterDeviceToken, sendPushToUsers } from '../services/push.service.js';

const r = Router();

const tokenSchema = z.object({
  token: z.string().min(10, 'Token inválido'),
  platform: z.enum(['android', 'ios', 'web']).optional(),
});

// App registra o token FCM do dispositivo após o login.
r.post('/register', authenticate, asyncHandler(async (req, res) => {
  const { token, platform } = tokenSchema.parse(req.body);
  await registerDeviceToken({ userId: req.user.id, token, platform });
  res.json({ ok: true });
}));

// Logout / desativar notificações no dispositivo.
r.post('/unregister', authenticate, asyncHandler(async (req, res) => {
  const { token } = tokenSchema.parse(req.body);
  await unregisterDeviceToken(token);
  res.json({ ok: true });
}));

// Validação end-to-end: Líder dispara um push de teste pro próprio usuário
// (ou pra todos, com {all: true}).
r.post('/test', authenticate, authorize('LIDER'), asyncHandler(async (req, res) => {
  const all = Boolean(req.body?.all);
  const result = await sendPushToUsers(all ? null : [req.user.id], {
    title: req.body?.title || 'Airton Artus Digital',
    body: req.body?.body || 'Push de teste — canal de notificações funcionando. ✅',
    data: { kind: 'test' },
  });
  res.json(result);
}));

export default r;
