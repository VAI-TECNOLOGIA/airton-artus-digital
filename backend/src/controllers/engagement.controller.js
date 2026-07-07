import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { addPoints } from '../services/score.service.js';
import { TASK_TYPES } from '../utils/enums.js';
import { nullifyEmpty } from '../utils/helpers.js';

export const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.volunteerId) where.volunteerId = req.query.volunteerId;
  if (req.query.type) where.type = req.query.type;
  const data = await prisma.engagement.findMany({
    where,
    include: { volunteer: { include: { supporter: { select: { name: true } } } }, task: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  res.json({ data });
});

const schema = z.object({
  volunteerId: z.string().uuid(),
  type: z.enum(TASK_TYPES),
  taskId: z.string().uuid().nullable().optional(),
  proofUrl: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(nullifyEmpty(req.body));

  let points = 10;
  if (data.taskId) {
    const t = await prisma.task.findUnique({ where: { id: data.taskId } });
    if (t) points = t.points;
  } else {
    const t = await prisma.task.findFirst({ where: { type: data.type, active: true } });
    if (t) points = t.points;
  }

  const engagement = await prisma.engagement.create({ data: { ...data, points } });
  await addPoints(data.volunteerId, points, `Engajamento: ${data.type}`, data.type);
  res.status(201).json(engagement);
});

export const validate = asyncHandler(async (req, res) => {
  const eng = await prisma.engagement.update({
    where: { id: req.params.id },
    data: { validated: true, validatedById: req.user?.id },
  });
  res.json(eng);
});
