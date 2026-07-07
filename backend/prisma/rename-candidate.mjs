// Update NÃO-DESTRUTIVO: renomeia "Candidato DEMO" → "Candidato Teste" no banco
// sem apagar os dados (apoiadores, voluntários, etc.). Roda uma vez no build.
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const OLD = 'Candidato DEMO';
const NEW = 'Candidato Teste';

async function main() {
  // 1) Setting da campanha (candidate exibido em Configurações / IA / painel)
  const setting = await prisma.setting.findFirst({ where: { key: 'campaign' } });
  if (setting && setting.value && typeof setting.value === 'object') {
    const v = { ...setting.value };
    if (v.candidate === OLD) v.candidate = NEW;
    await prisma.setting.update({ where: { id: setting.id }, data: { value: v } });
    console.log('✔ setting.campaign.candidate =', v.candidate);
  }

  // 2) Automações (mensagens)
  const autos = await prisma.automation.findMany();
  for (const a of autos) {
    if (a.message && a.message.includes(OLD)) {
      await prisma.automation.update({ where: { id: a.id }, data: { message: a.message.split(OLD).join(NEW) } });
    }
  }

  // 3) Mídia Kit (legendas)
  const kits = await prisma.mediaKit.findMany();
  for (const m of kits) {
    if (m.captionText && m.captionText.includes(OLD)) {
      await prisma.mediaKit.update({ where: { id: m.id }, data: { captionText: m.captionText.split(OLD).join(NEW) } });
    }
  }

  console.log('✅ Renomeação concluída: "Candidato DEMO" → "Candidato Teste"');
}

main()
  .catch((e) => { console.error('❌ Erro no rename:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
