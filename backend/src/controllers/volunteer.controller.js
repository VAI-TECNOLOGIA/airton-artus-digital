import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { volunteerRanking } from '../services/score.service.js';

const include = {
  supporter: {
    select: {
      id: true, name: true, phone: true, whatsapp: true, cityName: true, neighborhood: true,
      photoUrl: true, status: true, supportType: true, regionId: true,
    },
  },
  supervisor: { select: { id: true, name: true } },
};

export const list = asyncHandler(async (req, res) => {
  const u = req.user;
  const where = {};
  // Hierarquia: LÍDER e MEMBRO (equipe interna) enxergam todos os voluntários.
  if (req.query.active === 'true' || req.query.active === 'false') where.active = req.query.active === 'true';
  if (req.query.confirmed === 'true' || req.query.confirmed === 'false') where.confirmed = req.query.confirmed === 'true';
  if (req.query.search) {
    where.supporter = { ...(where.supporter || {}), name: { contains: req.query.search, mode: 'insensitive' } };
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Number(req.query.pageSize) || 20);
  const [data, total] = await Promise.all([
    prisma.volunteer.findMany({ where, include, orderBy: { totalScore: 'desc' }, take: pageSize, skip: (page - 1) * pageSize }),
    prisma.volunteer.count({ where }),
  ]);
  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 } });
});

export const get = asyncHandler(async (req, res) => {
  const v = await prisma.volunteer.findUnique({
    where: { id: req.params.id },
    include: {
      ...include,
      engagements: { orderBy: { createdAt: 'desc' }, take: 30, include: { task: true } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      scores: { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  });
  if (!v) throw new AppError('Voluntário não encontrado', 404);
  res.json(v);
});

export const update = asyncHandler(async (req, res) => {
  const { active, supervisorId, helpPreference } = req.body;
  const v = await prisma.volunteer.update({
    where: { id: req.params.id },
    data: {
      ...(active !== undefined ? { active: !!active } : {}),
      ...(supervisorId !== undefined ? { supervisorId: supervisorId || null } : {}),
      ...(helpPreference !== undefined ? { helpPreference } : {}),
    },
    include,
  });
  res.json(v);
});

export const ranking = asyncHandler(async (req, res) => {
  const data = await volunteerRanking({
    limit: Number(req.query.limit) || 20,
    regionId: req.query.regionId || undefined,
    supervisorId: req.query.supervisorId || undefined,
  });
  res.json({ data: data.map((v, i) => ({ rank: i + 1, ...v })) });
});
