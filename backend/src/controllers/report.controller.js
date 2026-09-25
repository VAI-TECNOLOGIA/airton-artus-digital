import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Relatório consolidado. */
export const summary = asyncHandler(async (req, res) => {
  const [
    supportersByRegion,
    supportersByCity,
    bannersByStatus,
    actionsByType,
    engagementByType,
    demandsByCategory,
    materialsDelivered,
    supportersByCreatorRaw,
  ] = await Promise.all([
    prisma.region.findMany({ select: { name: true, _count: { select: { supporters: true } } } }),
    prisma.supporter.groupBy({ by: ['cityName'], _count: { _all: true }, orderBy: { _count: { cityName: 'desc' } }, take: 15 }),
    prisma.bannerLocation.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.streetAction.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.engagement.groupBy({ by: ['type'], _count: { _all: true }, _sum: { points: true } }),
    prisma.demand.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.materialRequest.groupBy({ by: ['materialName'], where: { status: 'ENTREGUE' }, _sum: { quantity: true } }),
    prisma.supporter.groupBy({ by: ['createdById'], _count: { _all: true }, orderBy: { _count: { createdById: 'desc' } } }),
  ]);

  // Quem cadastrou cada apoiador (ranking). null = cadastro público (LP/site).
  const creatorIds = supportersByCreatorRaw.map((c) => c.createdById).filter(Boolean);
  const creators = creatorIds.length
    ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
    : [];
  const creatorName = Object.fromEntries(creators.map((u) => [u.id, u.name]));
  const supportersByCreator = supportersByCreatorRaw
    .map((c) => ({
      name: c.createdById ? (creatorName[c.createdById] || 'Usuário removido') : 'Cadastro público',
      value: c._count._all,
    }))
    .sort((a, b) => b.value - a.value);

  res.json({
    supportersByCreator,
    supportersByRegion: supportersByRegion.map((r) => ({ name: r.name, value: r._count.supporters })),
    supportersByCity: supportersByCity.map((c) => ({ name: c.cityName || 'Não informado', value: c._count._all })),
    bannersByStatus: bannersByStatus.map((b) => ({ name: b.status, value: b._count._all })),
    actionsByType: actionsByType.map((a) => ({ name: a.type, value: a._count._all })),
    engagementByType: engagementByType.map((e) => ({ name: e.type, value: e._count._all, points: e._sum.points || 0 })),
    demandsByCategory: demandsByCategory.map((d) => ({ name: d.category, value: d._count._all })),
    materialsDelivered: materialsDelivered.map((m) => ({ name: m.materialName, value: m._sum.quantity || 0 })),
  });
});

/** Crescimento da base ao longo do tempo (série acumulada por dia). */
export const growth = asyncHandler(async (req, res) => {
  // Cap defensivo: 100k linhas é ~4MB — não trava memoria da lambda.
  // Se o banco crescer além disso, migrar pra agregação SQL (DATE_TRUNC).
  const supporters = await prisma.supporter.findMany({
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: 100_000,
  });
  const byDay = {};
  for (const s of supporters) {
    const day = s.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }
  let cumulative = 0;
  const series = Object.entries(byDay).map(([date, count]) => {
    cumulative += count;
    return { date, count, total: cumulative };
  });
  res.json({ series });
});
