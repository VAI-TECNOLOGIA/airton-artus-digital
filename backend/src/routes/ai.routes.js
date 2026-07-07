import { Router } from 'express';
import * as ai from '../controllers/ai.controller.js';

// Todas as rotas exigem autenticação (montadas após authenticate no index).
// A permissão por papel é aplicada DENTRO do serviço (contexto filtrado).
const r = Router();

r.get('/status', ai.status);
r.post('/chat', ai.chat);

export default r;
