import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';
import { MATERIAL_REQUEST_STATUS } from '../utils/enums.js';
import { nullifyEmpty } from '../utils/helpers.js';

const include = {
  material: true,
  requester: { select: { id: true, name: true } },
  approver: { select: { id: true, name: true } },
};

export const list = asyncHandler(async (req, res) => {
  const u = req.user;
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (u.role === 'PARCEIRO') where.requesterId = u.id; // parceiro vê só os próprios pedidos

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Number(req.query.pageSize) || 20);
  const [data, total] = await Promise.all([
    prisma.materialRequest.findMany({ where, include, orderBy: { createdAt: 'desc' }, take: pageSize, skip: (page - 1) * pageSize }),
    prisma.materialRequest.count({ where }),
  ]);
  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 } });
});

const schema = z.object({
  materialId: z.string().uuid().nullable().optional(),
  materialName: z.string().min(1, 'Material obrigatório'),
  quantity: z.coerce.number().int().positive(),
  justification: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
});

export const create = asyncHandler(async (req, res) => {
  const data = schema.parse(nullifyEmpty(req.body));
  const request = await prisma.materialRequest.create({ data: { ...data, requesterId: req.user?.id }, include });
  res.status(201).json(request);
});

export const requesterHistory = asyncHandler(async (req, res) => {
  const requesterId = req.params.userId;
  const [history, totals] = await Promise.all([
    prisma.materialRequest.findMany({ where: { requesterId }, orderBy: { createdAt: 'desc' } }),
    prisma.materialRequest.groupBy({
      by: ['materialName'],
      where: { requesterId, status: 'ENTREGUE' },
      _sum: { quantity: true },
    }),
  ]);
  res.json({
    history,
    deliveredTotals: totals.map((t) => ({ material: t.materialName, quantity: t._sum.quantity || 0 })),
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(MATERIAL_REQUEST_STATUS) }).parse(req.body);
  const data = { status };
  if (status === 'APROVADO') {
    data.approvedAt = new Date();
    data.approverId = req.user?.id;
  }
  if (status === 'ENTREGUE') data.deliveredAt = new Date();

  const r = await prisma.materialRequest.update({ where: { id: req.params.id }, data, include });
  await audit({ userId: req.user?.id, action: `STATUS:${status}`, entity: 'MaterialRequest', entityId: r.id, ip: req.ip });
  res.json(r);
});

export const update = asyncHandler(async (req, res) => {
  const data = nullifyEmpty(req.body);
  ['id', 'material', 'requester', 'approver', 'createdAt', 'updatedAt'].forEach((k) => delete data[k]);
  if (data.quantity !== undefined && data.quantity !== null) data.quantity = Number(data.quantity);
  const r = await prisma.materialRequest.update({ where: { id: req.params.id }, data, include });
  res.json(r);
});

export const remove = asyncHandler(async (req, res) => {
  await prisma.materialRequest.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
