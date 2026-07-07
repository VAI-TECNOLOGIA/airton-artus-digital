// Backfill de códigos únicos dos membros + dados demo do chat interno.
// Não apaga nada — idempotente onde possível.
import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

function genCode(used) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = 'MB-' + Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (used.has(c));
  used.add(c);
  return c;
}

async function main() {
  // 1) códigos para todos os usuários (somente quem não tem)
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, code: true } });
  const used = new Set(users.map((u) => u.code).filter(Boolean));
  for (const u of users) {
    if (!u.code) {
      await prisma.user.update({ where: { id: u.id }, data: { code: genCode(used) } });
    }
  }
  console.log(`Códigos garantidos para ${users.length} usuários.`);

  // membros internos (equipe)
  const team = await prisma.user.findMany({ where: { role: { in: ['LIDER', 'MEMBRO'] } }, select: { id: true, name: true } });
  const lider = team[0];
  const ids = team.map((t) => t.id);

  // evita duplicar se já rodou
  const existing = await prisma.internalThread.count();
  if (existing > 0) {
    console.log(`Já existem ${existing} conversas internas — pulando criação de demo.`);
    return;
  }

  // 2) Grupo "Coordenação Geral" com toda a equipe
  const grupo = await prisma.internalThread.create({
    data: {
      type: 'GROUP', name: 'Coordenação Geral', createdById: lider.id,
      members: { create: ids.map((userId) => ({ userId })) },
      messages: { create: [
        { senderId: lider.id, body: 'Bom dia, equipe! 🌅 Foco total na agenda desta semana.' },
        { senderId: team[1]?.id || lider.id, body: 'Combinado! Zona Norte com 3 ações confirmadas.' },
      ] },
    },
  });

  // 3) Campanha interna "Caminhada Centro"
  await prisma.internalThread.create({
    data: {
      type: 'CAMPAIGN', name: 'Caminhada Centro', createdById: lider.id,
      members: { create: ids.slice(0, Math.min(4, ids.length)).map((userId) => ({ userId })) },
      messages: { create: [
        { senderId: lider.id, body: '📣 Mobilização para a caminhada no Centro sábado às 10h. Levem as faixas!' },
      ] },
    },
  });

  // 4) Conversa direta entre os dois primeiros membros
  if (team[1]) {
    await prisma.internalThread.create({
      data: {
        type: 'DIRECT', createdById: lider.id,
        members: { create: [{ userId: lider.id }, { userId: team[1].id }] },
        messages: { create: [
          { senderId: team[1].id, body: 'Chefe, posso confirmar o material para a Zona Sul?' },
          { senderId: lider.id, body: 'Pode sim 👍 já aprovei o pedido.' },
        ] },
      },
    });
  }

  console.log('✅ Demo interno criado: 1 grupo, 1 campanha, 1 conversa direta.');
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERRO:', e.message); await prisma.$disconnect(); process.exit(1); });
