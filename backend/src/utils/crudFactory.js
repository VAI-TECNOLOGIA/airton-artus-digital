import prisma from '../config/prisma.js';
import { asyncHandler } from './asyncHandler.js';
import { AppError } from './AppError.js';
import { audit } from './audit.js';

function pick(obj, fields) {
  if (!fields || !fields.length) return { ...obj };
  const out = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}

/** Fábrica de controllers CRUD genérica e reutilizável. */
export function crudFactory(modelKey, options = {}) {
  const {
    searchFields = [],
    include,
    orderBy = { createdAt: 'desc' },
    scope,
    allowedFilters = [],
    writableFields,
    dateFields = [],
    numberFields = [],
    boolFields = [],
    transformIn = (data) => data,
    // Efeito colateral pós-criação (ex.: push notification). Fire-and-forget:
    // erro aqui não pode derrubar a resposta do CRUD.
    afterCreate = null,
    label = modelKey,
  } = options;

  const model = () => prisma[modelKey];

  function coerce(input) {
    const data = { ...input };
    for (const key of Object.keys(data)) {
      if (data[key] === '') data[key] = null;
    }
    for (const f of dateFields) {
      if (data[f] !== undefined && data[f] !== null) data[f] = new Date(data[f]);
    }
    for (const f of numberFields) {
      if (data[f] !== undefined && data[f] !== null) data[f] = Number(data[f]);
    }
    for (const f of boolFields) {
      if (data[f] !== undefined && data[f] !== null) {
        data[f] = data[f] === true || data[f] === 'true';
      }
    }
    return data;
  }

  function buildWhere(req) {
    const and = [];
    if (scope) {
      const s = scope(req);
      if (s && Object.keys(s).length) and.push(s);
    }
    for (const key of allowedFilters) {
      const v = req.query[key];
      if (v !== undefined && v !== '') and.push({ [key]: v });
    }
    const { search } = req.query;
    if (search && searchFields.length) {
      and.push({
        OR: searchFields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } })),
      });
    }
    return and.length ? { AND: and } : {};
  }

  const list = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(500, Number(req.query.pageSize) || 20);
    const where = buildWhere(req);
    const [data, total] = await Promise.all([
      model().findMany({ where, include, orderBy, take: pageSize, skip: (page - 1) * pageSize }),
      model().count({ where }),
    ]);
    res.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    });
  });

  const get = asyncHandler(async (req, res) => {
    const item = await model().findUnique({ where: { id: req.params.id }, include });
    if (!item) throw new AppError(`${label} não encontrado`, 404);
    res.json(item);
  });

  const create = asyncHandler(async (req, res) => {
    const data = await transformIn(coerce(pick(req.body, writableFields)), req);
    const item = await model().create({ data, include });
    await audit({ userId: req.user?.id, action: 'CREATE', entity: modelKey, entityId: item.id, changes: data, ip: req.ip });
    if (afterCreate) {
      Promise.resolve(afterCreate(item, req)).catch((e) =>
        console.warn(`[${label}] afterCreate falhou:`, e.message)
      );
    }
    res.status(201).json(item);
  });

  const update = asyncHandler(async (req, res) => {
    const data = await transformIn(coerce(pick(req.body, writableFields)), req);
    const item = await model().update({ where: { id: req.params.id }, data, include });
    await audit({ userId: req.user?.id, action: 'UPDATE', entity: modelKey, entityId: item.id, changes: data, ip: req.ip });
    res.json(item);
  });

  const remove = asyncHandler(async (req, res) => {
    await model().delete({ where: { id: req.params.id } });
    await audit({ userId: req.user?.id, action: 'DELETE', entity: modelKey, entityId: req.params.id, ip: req.ip });
    res.status(204).send();
  });

  return { list, get, create, update, remove, buildWhere, model };
}
