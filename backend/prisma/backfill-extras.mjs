// Bug 7/9: preenche regionId dos apoiadores (distribuição determinística por cidade)
// e cria alguns duplicados reais para a tela de Suspeitos. Não destrutivo.
import { PrismaClient } from '../src/generated/prisma/index.js';
const p = new PrismaClient();

async function main() {
  const regions = await p.region.findMany({ select: { id: true, name: true } });
  if (!regions.length) { console.log('Sem regiões cadastradas.'); return; }

  // distribui apoiadores SEM região entre as regiões existentes (mesma cidade => mesma região)
  for (let i = 0; i < regions.length; i++) {
    const n = await p.$executeRawUnsafe(
      `UPDATE "Supporter" SET "regionId" = $1
       WHERE "regionId" IS NULL AND (abs(hashtext(coalesce("cityName",''))) % ${regions.length}) = ${i}`,
      regions[i].id
    );
    console.log(`  região ${regions[i].name}: +${n} apoiadores`);
  }

  // cria duplicados reais (mesmo telefone) para o "Duplicado de" exibir nomes
  const already = await p.supporter.count({ where: { duplicateOfId: { not: null } } });
  if (already === 0) {
    const sample = await p.supporter.findMany({ take: 6, orderBy: { createdAt: 'desc' } });
    for (const s of sample) {
      await p.supporter.create({
        data: {
          name: s.name.replace(/\s\(2\)$/, '') + ' (2)', phone: s.phone, cityName: s.cityName,
          lat: s.lat, lng: s.lng, regionId: s.regionId, supportType: s.supportType,
          status: 'SUSPEITO', flaggedReason: `Telefone duplicado — já cadastrado para "${s.name}".`, duplicateOfId: s.id,
        },
      });
      await p.supporter.update({ where: { id: s.id }, data: { status: 'SUSPEITO', flaggedReason: 'Telefone usado em mais de um cadastro.' } });
    }
    console.log(`  duplicados criados: ${sample.length}`);
  } else {
    console.log(`  duplicados já existem: ${already} (pulado)`);
  }

  const withRegion = await p.supporter.count({ where: { regionId: { not: null } } });
  const total = await p.supporter.count();
  console.log(`✅ Apoiadores com região: ${withRegion}/${total}`);
}

main().then(() => p.$disconnect()).catch(async (e) => { console.error('ERRO:', e.message); await p.$disconnect(); process.exit(1); });
