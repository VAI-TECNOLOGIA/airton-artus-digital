import { asyncHandler } from '../utils/asyncHandler.js';
import { getAiStatus, chatWithAI } from '../services/ai.service.js';

// Status (sem token) — qualquer usuário autenticado pode consultar
// para saber se o assistente está ativo.
export const status = asyncHandler(async (req, res) => {
  res.json(await getAiStatus());
});

// Conversa — respeita a permissão do usuário autenticado (req.user).
export const chat = asyncHandler(async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (!messages.length) return res.status(400).json({ error: 'Envie ao menos uma mensagem.' });
  const out = await chatWithAI({ user: req.user, messages });
  res.json(out);
});
