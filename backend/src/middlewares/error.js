// IMPORTANTE: o client é gerado em src/generated/prisma (não em @prisma/client).
// Importar do pacote errado deixa Prisma.* indefinido e o instanceof explode
// DENTRO do errorHandler — derrubando pro handler HTML default do Express.
import { Prisma } from '../generated/prisma/index.js';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Rota não encontrada', path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Dados inválidos',
      issues: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Registro duplicado', fields: err.meta?.target });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Referência inválida (chave estrangeira)' });
    }
    return res.status(400).json({ error: 'Erro de banco de dados', code: err.code });
  }

  // Payload que não bate com o schema (ex.: enum inválido via API direta).
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Dados inválidos para o banco',
      hint: 'Verifique os valores enviados (enums, tipos e campos obrigatórios).',
    });
  }

  console.error('[ERRO]', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
