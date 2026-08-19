import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canonicalCityName } from '../utils/cityNormalize.js';

/** Colapsa variações de cidade (acento/caixa/espaço/typo) no gráfico e devolve top 12. */
function mergeByCity(rows) {
  const map = new Map();
  for (const c of rows) {
    const name = canonicalCityName(c.cityName) || 'Não informado';
    map.set(name, (map.get(name) || 0) + c._count._all);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

/** Indicadores principais do painel. */
export const getStats = asyncHandler(async (req, res) => {
  const [
    totalSupporters,
    totalVolunteers,
    activeVolunteers,
    pendingVolunteers,
    authorizedBanners,
    deliveredMaterials,
    pendingRequests,
    doneActions,
    suspects,
    blacklisted,
    openDemands,
    openConversations,
  ] = await Promise.all([
    prisma.supporter.count(),
    prisma.volunteer.count(),
    prisma.volunteer.count({ where: { active: true } }),
    prisma.supporter.count({ where: { status: 'PENDENTE' } }),
    prisma.bannerLocation.count({ where: { status: { in: ['AUTORIZADO', 'INSTALADO'] } } }),
    prisma.materialRequest.count({ where: { status: 'ENTREGUE' } }),
    prisma.materialRequest.count({
      where: { status: { in: ['SOLICITADO', 'EM_ANALISE', 'APROVADO', 'SEPARADO'] } },
    }),
    prisma.streetAction.count({ where: { status: 'REALIZADA' } }),
    prisma.supporter.count({ where: { status: 'SUSPEITO' } }),
    prisma.supporter.count({ where: { status: 'BLACKLIST' } }),
    prisma.demand.count({ where: { status: { in: ['NOVA', 'EM_ANALISE', 'EM_ANDAMENTO'] } } }),
    prisma.conversation.count({ where: { status: { in: ['ABERTA', 'EM_ATENDIMENTO', 'AGUARDANDO'] } } }),
  ]);

  res.json({
    totalSupporters,
    totalVolunteers,
    activeVolunteers,
    pendingVolunteers,
    authorizedBanners,
    deliveredMaterials,
    pendingRequests,
    doneActions,
    suspects,
    blacklisted,
    openDemands,
    openConversations,
  });
});

/** Dados para os gráficos do painel. */
export const getCharts = asyncHandler(async (req, res) => {
  const [byRegionRaw, byCityRaw, byStatusRaw, bySupportRaw] = await Promise.all([
    prisma.region.findMany({
      select: { name: true, color: true, _count: { select: { supporters: true } } },
    }),
    prisma.supporter.groupBy({
      by: ['cityName'],
      _count: { _all: true },
    }),
    prisma.supporter.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.supporter.groupBy({ by: ['supportType'], _count: { _all: true } }),
  ]);

  const regions = byRegionRaw
    .map((r) => ({ name: r.name, value: r._count.supporters, color: r.color }))
    .sort((a, b) => b.value - a.value);

  res.json({
    byRegion: regions,
    strongRegions: regions.slice(0, 3),
    weakRegions: regions.filter((r) => r.value <= 1),
    byCity: mergeByCity(byCityRaw),
    byStatus: byStatusRaw.map((s) => ({ name: s.status, value: s._count._all })),
    bySupportType: bySupportRaw.map((s) => ({ name: s.supportType, value: s._count._all })),
  });
});

/** Camadas georreferenciadas do mapa político (fonte única e agregada). */
export const getMap = asyncHandler(async (req, res) => {
  const geo = { lat: { not: null }, lng: { not: null } };
  const [supporters, banners, streetActions] = await Promise.all([
    prisma.supporter.findMany({
      where: geo,
      select: { id: true, name: true, lat: true, lng: true, cityName: true, neighborhood: true, supportType: true, phone: true },
      take: 3000,
    }),
    prisma.bannerLocation.findMany({
      where: geo,
      select: { id: true, responsibleName: true, address: true, cityName: true, neighborhood: true, lat: true, lng: true, status: true },
      take: 1000,
    }),
    prisma.streetAction.findMany({
      where: geo,
      select: { id: true, title: true, type: true, lat: true, lng: true, neighborhood: true, date: true },
      take: 1000,
    }),
  ]);
  res.json({ supporters, banners, streetActions });
});

/** Rankings de coordenadores e voluntários. */
export const getRankings = asyncHandler(async (req, res) => {
  const [volunteers, coordinators] = await Promise.all([
    prisma.volunteer.findMany({
      orderBy: { totalScore: 'desc' },
      take: 10,
      include: { supporter: { select: { name: true, cityName: true, photoUrl: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'MEMBRO' },
      select: {
        id: true,
        name: true,
        region: { select: { name: true } },
        _count: { select: { coordinatedSupporters: true } },
      },
      orderBy: { coordinatedSupporters: { _count: 'desc' } },
      take: 10,
    }),
  ]);

  res.json({
    volunteers: volunteers.map((v, i) => ({
      rank: i + 1,
      id: v.id,
      name: v.supporter?.name || 'Voluntário',
      score: v.totalScore,
      city: v.supporter?.cityName,
      photoUrl: v.supporter?.photoUrl,
    })),
    coordinators: coordinators.map((c, i) => ({
      rank: i + 1,
      id: c.id,
      name: c.name,
      region: c.region?.name || '—',
      supporters: c._count.coordinatedSupporters,
    })),
  });
});
