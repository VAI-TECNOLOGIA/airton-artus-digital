import prisma from '../config/prisma.js';

/** Adiciona pontos a um voluntário e registra no extrato (Score). */
export async function addPoints(volunteerId, points, reason, engagementType) {
  if (!volunteerId || !points) return null;
  const [score] = await prisma.$transaction([
    prisma.score.create({ data: { volunteerId, points, reason, engagementType } }),
    prisma.volunteer.update({
      where: { id: volunteerId },
      data: { totalScore: { increment: points }, active: true },
    }),
  ]);
  return score;
}

/** Ranking de voluntários (geral, por região ou por supervisor). */
export async function volunteerRanking({ limit = 10, regionId, supervisorId } = {}) {
  const where = {};
  if (supervisorId) where.supervisorId = supervisorId;
  if (regionId) where.supporter = { regionId };
  return prisma.volunteer.findMany({
    where,
    orderBy: { totalScore: 'desc' },
    take: limit,
    include: {
      supporter: { select: { name: true, regionId: true, cityName: true, photoUrl: true } },
    },
  });
}
