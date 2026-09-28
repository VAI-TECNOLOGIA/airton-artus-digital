// Backfill Supporter.createdById a partir do AuditLog (action=CREATE, entity=Supporter).
// Rodar UMA vez após o db push que adiciona a coluna createdById.
//   node scripts/backfill-created-by.js
import prisma from '../src/config/prisma.js';

async function main() {
  // 1. Logs de criação de apoiador, do mais antigo pro mais novo (o primeiro é quem cadastrou).
  const logs = await prisma.auditLog.findMany({
    where: { entity: 'Supporter', action: 'CREATE', entityId: { not: null }, userId: { not: null } },
    select: { entityId: true, userId: true },
    orderBy: { createdAt: 'asc' },
  });

  // entityId -> userId (mantém o PRIMEIRO log de cada apoiador)
  const creatorOf = new Map();
  for (const l of logs) if (!creatorOf.has(l.entityId)) creatorOf.set(l.entityId, l.userId);
  console.log(`AuditLog: ${logs.length} logs CREATE · ${creatorOf.size} apoiadores com autor identificável`);

  // 2. Só os apoiadores que ainda estão sem createdById.
  const pending = await prisma.supporter.findMany({
    where: { createdById: null },
    select: { id: true },
  });
  console.log(`Apoiadores sem "cadastrado por": ${pending.length}`);

  // 3. Confere que o userId ainda existe (evita violar a FK; SetNull cobre remoções futuras).
  const userIds = [...new Set([...creatorOf.values()])];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } });
  const validUser = new Set(users.map((u) => u.id));

  let updated = 0, noLog = 0, ghostUser = 0;
  for (const s of pending) {
    const uid = creatorOf.get(s.id);
    if (!uid) { noLog++; continue; }                 // cadastro público (LP/site) ou log ausente
    if (!validUser.has(uid)) { ghostUser++; continue; } // usuário já removido
    await prisma.supporter.update({ where: { id: s.id }, data: { createdById: uid } });
    updated++;
  }

  console.log(`\nResultado:`);
  console.log(`  atualizados ............. ${updated}`);
  console.log(`  sem log (cadastro público) ${noLog}`);
  console.log(`  autor já removido ....... ${ghostUser}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
