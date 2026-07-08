// Bootstrap de PRODUÇÃO — cria apenas dados de referência, de forma idempotente.
// NÃO apaga nada e NÃO cria dados fake (para isso existe o seed.js, só p/ dev).
//
// Cria/garante: perfis (Role), regiões e cidades do RS, tarefas de engajamento,
// materiais, configurações da campanha e o usuário administrador.
//
// Uso:
//   APP_DATABASE_URL=... ADMIN_PASS='SenhaForte' node prisma/bootstrap-prod.mjs
// Se ADMIN_PASS não for informado, uma senha aleatória é gerada e exibida UMA vez.
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@airtonartus.com.br';

const ROLES = [
  { key: 'LIDER', name: 'Líder de Campanha', description: 'Acesso total à plataforma: estratégia, usuários, configurações e disparos.', permissions: ['*'] },
  { key: 'MEMBRO', name: 'Membro da Equipe', description: 'Equipe interna: base de apoiadores/voluntários, comunicação, mobilização e materiais.', permissions: ['supporters', 'volunteers', 'notices', 'actions', 'events', 'media-kit', 'conversations', 'demands', 'materials'] },
  { key: 'PARCEIRO', name: 'Parceiro', description: 'Apoiador externo: painel próprio, mídia kit, tarefas, agenda e pedidos de material.', permissions: ['media-kit:read', 'tasks:self', 'materials:request', 'agenda:read'] },
];

const REGIONS = [
  { name: 'Vale do Taquari', color: '#E8AF3C' },
  { name: 'Vale do Rio Pardo', color: '#398254' },
  { name: 'Região Metropolitana', color: '#1B1D39' },
  { name: 'Serra', color: '#BD2E2F' },
  { name: 'Planalto', color: '#3554A5' },
  { name: 'Sul', color: '#7c3aed' },
];

const CITIES = [
  ['Venâncio Aires', 'Vale do Taquari'], ['Lajeado', 'Vale do Taquari'], ['Estrela', 'Vale do Taquari'],
  ['Teutônia', 'Vale do Taquari'], ['Encantado', 'Vale do Taquari'], ['Arroio do Meio', 'Vale do Taquari'],
  ['Taquari', 'Vale do Taquari'], ['Cruzeiro do Sul', 'Vale do Taquari'], ['Bom Retiro do Sul', 'Vale do Taquari'],
  ['Roca Sales', 'Vale do Taquari'], ['Mato Leitão', 'Vale do Taquari'], ['Santa Clara do Sul', 'Vale do Taquari'],
  ['Santa Cruz do Sul', 'Vale do Rio Pardo'], ['Vera Cruz', 'Vale do Rio Pardo'], ['Sobradinho', 'Vale do Rio Pardo'],
  ['Barros Cassal', 'Planalto'], ['Soledade', 'Planalto'], ['Passo Fundo', 'Planalto'], ['Erechim', 'Planalto'],
  ['Porto Alegre', 'Região Metropolitana'], ['Canoas', 'Região Metropolitana'], ['Gravataí', 'Região Metropolitana'],
  ['Novo Hamburgo', 'Região Metropolitana'], ['São Leopoldo', 'Região Metropolitana'],
  ['Caxias do Sul', 'Serra'], ['Bento Gonçalves', 'Serra'],
  ['Santa Maria', 'Sul'], ['Pelotas', 'Sul'],
];

const TASKS = [
  { type: 'POST_INSTAGRAM', title: 'Publiquei no Instagram', points: 15 },
  { type: 'POST_FACEBOOK', title: 'Publiquei no Facebook', points: 15 },
  { type: 'SHARE_WHATSAPP', title: 'Compartilhei no WhatsApp', points: 10 },
  { type: 'CAMINHADA', title: 'Participei da caminhada', points: 30 },
  { type: 'FAIXA', title: 'Coloquei faixa', points: 25 },
  { type: 'ADESIVOS', title: 'Entreguei adesivos', points: 20 },
  { type: 'CONVIDAR', title: 'Convidei pessoas', points: 10 },
  { type: 'EVENTO', title: 'Compareci ao evento', points: 25 },
];

const MATERIALS = [
  { name: 'Faixa 3x1m', category: 'Faixa', unit: 'un', stock: 0 },
  { name: 'Bandeira', category: 'Bandeira', unit: 'un', stock: 0 },
  { name: 'Adesivo de Carro', category: 'Adesivo', unit: 'un', stock: 0 },
  { name: 'Santinho', category: 'Santinho', unit: 'pacote', stock: 0 },
  { name: 'Camiseta', category: 'Camiseta', unit: 'un', stock: 0 },
  { name: 'Boné', category: 'Boné', unit: 'un', stock: 0 },
];

const SETTINGS = [
  { key: 'campaign', value: { name: 'Airton Artus Digital', candidate: 'Airton Artus', office: 'Deputado Estadual', party: 'PDT', number: '12012', city: 'Venâncio Aires', uf: 'RS', slogan: 'Saúde, trabalho e desenvolvimento para o RS' } },
  { key: 'theme', value: { brand: '#1B1D39', green: '#398254', accent: '#E8AF3C' } },
  { key: 'goals', value: { volunteers: 400, supporters: 5000, banners: 300, actions: 120 } },
];

async function main() {
  for (const r of ROLES) {
    await prisma.role.upsert({ where: { key: r.key }, create: r, update: { name: r.name, description: r.description, permissions: r.permissions } });
  }
  console.log(`[ok] ${ROLES.length} perfis`);

  const regionIds = {};
  for (const r of REGIONS) {
    const rec = await prisma.region.upsert({ where: { name: r.name }, create: { ...r, uf: 'RS' }, update: { color: r.color } });
    regionIds[r.name] = rec.id;
  }
  console.log(`[ok] ${REGIONS.length} regiões`);

  let cityCount = 0;
  for (const [name, region] of CITIES) {
    const existing = await prisma.city.findFirst({ where: { name, uf: 'RS' } });
    if (!existing) {
      await prisma.city.create({ data: { name, uf: 'RS', regionId: regionIds[region] } });
      cityCount++;
    }
  }
  console.log(`[ok] cidades (${cityCount} novas de ${CITIES.length})`);

  for (const t of TASKS) {
    const existing = await prisma.task.findFirst({ where: { type: t.type } });
    if (!existing) await prisma.task.create({ data: t });
  }
  console.log(`[ok] tarefas de engajamento`);

  for (const m of MATERIALS) {
    const existing = await prisma.material.findFirst({ where: { name: m.name } });
    if (!existing) await prisma.material.create({ data: m });
  }
  console.log(`[ok] materiais`);

  for (const s of SETTINGS) {
    await prisma.setting.upsert({ where: { key: s.key }, create: s, update: {} }); // não sobrescreve config existente
  }
  console.log(`[ok] configurações da campanha`);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`[ok] admin já existe: ${existing.email}`);
  } else {
    const pass = process.env.ADMIN_PASS || crypto.randomBytes(9).toString('base64url');
    await prisma.user.create({
      data: {
        name: 'Coordenação Geral',
        email: ADMIN_EMAIL,
        password: bcrypt.hashSync(pass, 12),
        role: 'LIDER',
        active: true,
      },
    });
    console.log(`[ok] admin criado: ${ADMIN_EMAIL}`);
    if (!process.env.ADMIN_PASS) console.log(`[!] senha gerada (guarde agora, não será exibida de novo): ${pass}`);
  }

  const totals = { users: await prisma.user.count(), cities: await prisma.city.count(), regions: await prisma.region.count() };
  console.log(`[ok] totais: ${JSON.stringify(totals)}`);
}

main()
  .catch((e) => { console.error('[erro]', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
