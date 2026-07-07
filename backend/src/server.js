import app from './app.js';
import env from './config/env.js';
import prisma from './config/prisma.js';

const server = app.listen(env.port, () => {
  console.log(`\n🚀 Campanha DEMO — API online`);
  console.log(`   URL:      ${env.publicUrl}`);
  console.log(`   Ambiente: ${env.nodeEnv}`);
  console.log(`   Health:   ${env.publicUrl}/health\n`);
});

async function shutdown(signal) {
  console.log(`\n${signal} recebido — encerrando...`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
