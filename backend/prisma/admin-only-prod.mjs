// Cria APENAS o usuário admin em produção. Idempotente — não sobrescreve se existir.
// Uso: APP_DATABASE_URL=... node prisma/admin-only-prod.mjs
import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin@123';

try {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`[ok] admin já existe: ${existing.email} (id=${existing.id})`);
  } else {
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: ADMIN_EMAIL,
        password: bcrypt.hashSync(ADMIN_PASS, 10),
        role: 'LIDER',
        phone: '5551999999999',
        active: true,
      },
    });
    console.log(`[ok] admin criado: ${admin.email} (id=${admin.id})`);
  }
  const total = await prisma.user.count();
  console.log(`[ok] total de usuários no banco: ${total}`);
} catch (e) {
  console.error('[erro]', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
