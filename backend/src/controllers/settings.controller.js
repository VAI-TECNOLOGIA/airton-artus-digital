import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Chaves cujo campo `token` nunca deve ser devolvido ao cliente.
// Em vez do valor, expõe apenas `hasToken` (booleano).
function maskSecrets(key, value) {
  if (key === 'ai' && value && typeof value === 'object') {
    const { token, ...rest } = value;
    return { ...rest, hasToken: !!token };
  }
  return value;
}

export const getAll = asyncHandler(async (req, res) => {
  const rows = await prisma.setting.findMany();
  const settings = {};
  rows.forEach((r) => {
    settings[r.key] = maskSecrets(r.key, r.value);
  });
  res.json(settings);
});

export const get = asyncHandler(async (req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: req.params.key } });
  res.json(row ? maskSecrets(req.params.key, row.value) : null);
});

export const upsert = asyncHandler(async (req, res) => {
  const { key } = req.params;
  let value = req.body?.value ?? req.body;

  // Para a IA: nunca sobrescreve o token com vazio. Se o cliente não mandou
  // token novo (campo ausente/vazio), preserva o que já está salvo. Isso deixa
  // o líder alterar provider/modelo/ativação sem reenviar o token.
  if (key === 'ai' && value && typeof value === 'object') {
    const existing = await prisma.setting.findUnique({ where: { key } });
    const prevToken = existing?.value?.token || '';
    // '' ou ausente → preserva o token atual; null → limpa; string → troca.
    if (value.token === '' || value.token === undefined) value = { ...value, token: prevToken };
    else if (value.token === null) value = { ...value, token: '' };
  }

  const row = await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  res.json(maskSecrets(key, row.value));
});

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  res.json({ data: roles });
});
