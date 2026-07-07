// Popula ~5.000 apoiadores distribuídos pelo RS (coordenadas reais + jitter).
// Não apaga dados existentes — apenas adiciona.
import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

const N = 5000;

// Cidades do RS com peso (distribuição ~ proporcional ao porte).
const CITIES = [
  { name: 'Porto Alegre', lat: -30.0346, lng: -51.2177, w: 26 },
  { name: 'Caxias do Sul', lat: -29.1678, lng: -51.1794, w: 9 },
  { name: 'Canoas', lat: -29.9177, lng: -51.1844, w: 6 },
  { name: 'Pelotas', lat: -31.7654, lng: -52.3376, w: 6 },
  { name: 'Santa Maria', lat: -29.6842, lng: -53.8069, w: 5 },
  { name: 'Gravataí', lat: -29.9444, lng: -50.9919, w: 5 },
  { name: 'Viamão', lat: -30.0811, lng: -51.0233, w: 4 },
  { name: 'Novo Hamburgo', lat: -29.6783, lng: -51.1306, w: 4 },
  { name: 'São Leopoldo', lat: -29.7603, lng: -51.1472, w: 4 },
  { name: 'Rio Grande', lat: -32.035, lng: -52.0986, w: 3 },
  { name: 'Alvorada', lat: -29.9897, lng: -51.0809, w: 3 },
  { name: 'Passo Fundo', lat: -28.2576, lng: -52.4091, w: 3 },
  { name: 'Sapucaia do Sul', lat: -29.8378, lng: -51.1469, w: 2 },
  { name: 'Santa Cruz do Sul', lat: -29.7175, lng: -52.4258, w: 2 },
  { name: 'Cachoeirinha', lat: -29.9511, lng: -51.0939, w: 2 },
  { name: 'Bento Gonçalves', lat: -29.1662, lng: -51.5165, w: 2 },
  { name: 'Bagé', lat: -31.3314, lng: -54.1069, w: 2 },
  { name: 'Uruguaiana', lat: -29.7547, lng: -57.0883, w: 2 },
  { name: 'Erechim', lat: -27.6339, lng: -52.2747, w: 1.5 },
  { name: 'Ijuí', lat: -28.3878, lng: -53.9148, w: 1.5 },
  { name: 'Santo Ângelo', lat: -28.2992, lng: -54.263, w: 1.5 },
  { name: 'Lajeado', lat: -29.4669, lng: -51.9614, w: 1.5 },
  { name: 'Alegrete', lat: -29.7831, lng: -55.7919, w: 1.5 },
  { name: 'Farroupilha', lat: -29.225, lng: -51.3478, w: 1.5 },
  { name: 'Gramado', lat: -29.3787, lng: -50.8744, w: 1 },
];

const FIRST = ['Ana','Carlos','Mariana','João','Patrícia','Rafael','Juliana','Bruno','Fernanda','Lucas','Camila','Diego','Aline','Marcelo','Bianca','Rodrigo','Letícia','Felipe','Gabriela','Thiago','Rosane','Volnei','Marlene','Sérgio','Cláudia','Jair','Neusa','Vanderlei','Salete','Anderson'];
const LAST = ['Silva','Souza','Oliveira','Santos','Pereira','Lima','Costa','Martins','Rocha','Almeida','Nunes','Gomes','Ribeiro','Carvalho','Schmidt','Müller','Kunzler','Bortolini','Weber','Hartmann'];
const SUPPORT = ['VOLUNTARIO','FAIXA_CASA','ADESIVO_CARRO','MATERIAL_DIGITAL','CAMINHADA','EVENTOS','INDICAR','NOTICIAS','NOTICIAS','APOIADOR_NOTICIAS'];
const SUPPORT_VALID = ['VOLUNTARIO','FAIXA_CASA','ADESIVO_CARRO','MATERIAL_DIGITAL','CAMINHADA','EVENTOS','INDICAR','NOTICIAS'];
const STATUS = ['NOVO','NOVO','CONFIRMADO','CONFIRMADO','ATIVO','ATIVO','ATIVO','PENDENTE'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const jit = (v, r = 0.12) => v + (Math.random() - 0.5) * 2 * r;

// distribuição acumulada por peso
const totalW = CITIES.reduce((s, c) => s + c.w, 0);
function pickCity() {
  let r = Math.random() * totalW;
  for (const c of CITIES) { r -= c.w; if (r <= 0) return c; }
  return CITIES[0];
}

async function main() {
  console.log(`Gerando ${N} apoiadores pelo RS...`);
  const data = [];
  const now = Date.now();
  for (let i = 0; i < N; i++) {
    const c = pickCity();
    data.push({
      name: `${pick(FIRST)} ${pick(LAST)}`,
      phone: '5551' + String(Math.floor(900000000 + Math.random() * 99999999)).slice(0, 9),
      cityName: c.name,
      lat: jit(c.lat),
      lng: jit(c.lng),
      supportType: pick(SUPPORT_VALID),
      status: pick(STATUS),
      createdAt: new Date(now - Math.floor(Math.random() * 120) * 86400000),
    });
  }
  // insere em lotes
  const size = 1000;
  let inserted = 0;
  for (let i = 0; i < data.length; i += size) {
    const r = await prisma.supporter.createMany({ data: data.slice(i, i + size) });
    inserted += r.count;
    console.log(`  +${r.count} (total ${inserted})`);
  }
  const total = await prisma.supporter.count();
  console.log(`✅ Concluído. Apoiadores no banco: ${total}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERRO:', e.message); await prisma.$disconnect(); process.exit(1); });
