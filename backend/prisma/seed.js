import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const rand = (min, max) => Math.random() * (max - min) + min;
const jitter = (base, range = 0.05) => base + rand(-range, range);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const phone = () => '5551' + String(Math.floor(90000000 + Math.random() * 9999999));
const NOW = Date.now();
const DAY = 86400000;

// Timestamp recente com peso para "agora" — dá sensação de pré-campanha em tempo real.
function recentTs() {
  const r = Math.random();
  let daysAgo;
  if (r < 0.16) daysAgo = rand(0, 0.03);       // última ~40min
  else if (r < 0.5) daysAgo = rand(0, 2);       // últimos 2 dias
  else if (r < 0.82) daysAgo = rand(2, 9);      // última semana+
  else daysAgo = rand(9, 24);                   // até ~3 semanas
  return new Date(NOW - daysAgo * DAY);
}

// Cidades do RS com coordenadas (batem com o mapa do painel) + peso.
// Foco no Vale do Taquari — base eleitoral de Airton Artus — com presença estadual.
const RS_CITIES = [
  { name: 'Venâncio Aires', lat: -29.6143, lng: -52.1932, w: 24 },
  { name: 'Lajeado', lat: -29.4669, lng: -51.9614, w: 12 },
  { name: 'Estrela', lat: -29.5017, lng: -51.9651, w: 7 },
  { name: 'Teutônia', lat: -29.4482, lng: -51.8044, w: 6 },
  { name: 'Encantado', lat: -29.2367, lng: -51.8703, w: 5 },
  { name: 'Arroio do Meio', lat: -29.4014, lng: -51.945, w: 5 },
  { name: 'Taquari', lat: -29.7997, lng: -51.8644, w: 4 },
  { name: 'Cruzeiro do Sul', lat: -29.5147, lng: -52.0964, w: 4 },
  { name: 'Bom Retiro do Sul', lat: -29.607, lng: -51.9451, w: 3 },
  { name: 'Roca Sales', lat: -29.2886, lng: -51.8664, w: 3 },
  { name: 'Mato Leitão', lat: -29.528, lng: -52.1278, w: 3 },
  { name: 'Santa Clara do Sul', lat: -29.475, lng: -52.0847, w: 3 },
  { name: 'Santa Cruz do Sul', lat: -29.7175, lng: -52.4258, w: 6 },
  { name: 'Vera Cruz', lat: -29.7184, lng: -52.5152, w: 3 },
  { name: 'Sobradinho', lat: -29.4192, lng: -53.0292, w: 2 },
  { name: 'Barros Cassal', lat: -29.0939, lng: -52.5828, w: 3 },
  { name: 'Soledade', lat: -28.8306, lng: -52.5131, w: 2 },
  { name: 'Porto Alegre', lat: -30.0346, lng: -51.2177, w: 8 },
  { name: 'Canoas', lat: -29.9177, lng: -51.1844, w: 3 },
  { name: 'Gravataí', lat: -29.9444, lng: -50.9919, w: 2 },
  { name: 'Novo Hamburgo', lat: -29.6783, lng: -51.1306, w: 2 },
  { name: 'São Leopoldo', lat: -29.7603, lng: -51.1472, w: 2 },
  { name: 'Caxias do Sul', lat: -29.1678, lng: -51.1794, w: 3 },
  { name: 'Bento Gonçalves', lat: -29.1662, lng: -51.5165, w: 2 },
  { name: 'Passo Fundo', lat: -28.2576, lng: -52.4091, w: 2 },
  { name: 'Santa Maria', lat: -29.6842, lng: -53.8069, w: 2 },
  { name: 'Pelotas', lat: -31.7654, lng: -52.3376, w: 1 },
  { name: 'Erechim', lat: -27.6339, lng: -52.2747, w: 1 },
];
const CITY_BAG = RS_CITIES.flatMap((c) => Array(c.w).fill(c));
const pickCity = () => pick(CITY_BAG);

// Bairros e localidades típicas do Vale do Taquari.
const NEIGHBORHOODS = [
  'Centro', 'Battisti', 'Excelsior', 'Morsch', 'Gressler', 'Universitário', 'Aviação',
  'Leopoldina', 'Macedo', 'Coronel Brito', 'Vila Estância Nova', 'Linha Travessa',
  'Grão-Pará', 'Florestal', 'Moinhos', 'São Cristóvão', 'Hidráulica', 'Americano',
  'Santo Antônio', 'Oriental', 'Alto do Parque', 'Imigrante', 'Bela Vista', 'Navegantes',
];
const FIRST = ['Ana', 'Carlos', 'Mariana', 'João', 'Patrícia', 'Rafael', 'Juliana', 'Bruno', 'Fernanda', 'Lucas', 'Camila', 'Diego', 'Aline', 'Marcelo', 'Bianca', 'Rodrigo', 'Letícia', 'Felipe', 'Gabriela', 'Thiago', 'Rosane', 'Volnei', 'Marlene', 'Sérgio', 'Cláudia', 'Jair', 'Neusa', 'Vanderlei', 'Salete', 'Anderson', 'Ivone', 'Délcio'];
const LAST = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Lima', 'Costa', 'Martins', 'Rocha', 'Almeida', 'Nunes', 'Gomes', 'Ribeiro', 'Carvalho', 'Schmidt', 'Müller', 'Kunzler', 'Bortolini', 'Weber', 'Hartmann', 'Wickert', 'Feldens', 'Sulzbach', 'Gerhardt'];
const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;

const SUPPORT_TYPES = ['VOLUNTARIO', 'FAIXA_CASA', 'ADESIVO_CARRO', 'MATERIAL_DIGITAL', 'CAMINHADA', 'EVENTOS', 'INDICAR', 'NOTICIAS'];
const STATUSES = ['NOVO', 'CONFIRMADO', 'ATIVO', 'ATIVO', 'PENDENTE', 'INATIVO'];

async function clean() {
  console.log('🧹 Limpando base...');
  const order = [
    'auditLog', 'automationLog', 'automation', 'score', 'engagement', 'volunteerStatusHistory',
    'mediaDownload', 'mediaPublicationProof', 'message', 'conversation', 'broadcastContact',
    'broadcastCampaign', 'bannerLocation', 'materialRequest', 'streetAction', 'event', 'demand',
    'notice', 'mediaKit', 'task', 'material', 'volunteer', 'supporter', 'blacklist', 'city',
    'region', 'setting', 'role', 'user',
  ];
  for (const model of order) {
    await prisma[model].deleteMany();
  }
}

async function main() {
  await clean();

  console.log('👥 Perfis...');
  const roleData = [
    { key: 'LIDER', name: 'Líder de Campanha', description: 'Acesso total à plataforma: estratégia, usuários, configurações e disparos.', permissions: ['*'] },
    { key: 'MEMBRO', name: 'Membro da Equipe', description: 'Equipe interna: base de apoiadores/voluntários, comunicação, mobilização e materiais.', permissions: ['supporters', 'volunteers', 'notices', 'actions', 'events', 'media-kit', 'conversations', 'demands', 'materials'] },
    { key: 'PARCEIRO', name: 'Parceiro', description: 'Apoiador externo: painel próprio, mídia kit, tarefas, agenda e pedidos de material.', permissions: ['media-kit:read', 'tasks:self', 'materials:request', 'agenda:read'] },
  ];
  for (const r of roleData) await prisma.role.create({ data: r });

  console.log('🗺️  Regiões e cidades do RS...');
  const regionsSpec = [
    { name: 'Vale do Taquari', color: '#E8AF3C' },
    { name: 'Vale do Rio Pardo', color: '#398254' },
    { name: 'Região Metropolitana', color: '#1B1D39' },
    { name: 'Serra', color: '#BD2E2F' },
    { name: 'Planalto', color: '#3554A5' },
    { name: 'Sul', color: '#7c3aed' },
  ];
  const regions = {};
  for (const r of regionsSpec) {
    regions[r.name] = await prisma.region.create({ data: { name: r.name, uf: 'RS', color: r.color } });
  }

  const REGION_BY_CITY = {
    'Venâncio Aires': 'Vale do Taquari', 'Lajeado': 'Vale do Taquari', 'Estrela': 'Vale do Taquari',
    'Teutônia': 'Vale do Taquari', 'Encantado': 'Vale do Taquari', 'Arroio do Meio': 'Vale do Taquari',
    'Taquari': 'Vale do Taquari', 'Cruzeiro do Sul': 'Vale do Taquari', 'Bom Retiro do Sul': 'Vale do Taquari',
    'Roca Sales': 'Vale do Taquari', 'Mato Leitão': 'Vale do Taquari', 'Santa Clara do Sul': 'Vale do Taquari',
    'Santa Cruz do Sul': 'Vale do Rio Pardo', 'Vera Cruz': 'Vale do Rio Pardo', 'Sobradinho': 'Vale do Rio Pardo',
    'Barros Cassal': 'Planalto', 'Soledade': 'Planalto', 'Passo Fundo': 'Planalto', 'Erechim': 'Planalto',
    'Porto Alegre': 'Região Metropolitana', 'Canoas': 'Região Metropolitana', 'Gravataí': 'Região Metropolitana',
    'Novo Hamburgo': 'Região Metropolitana', 'São Leopoldo': 'Região Metropolitana',
    'Caxias do Sul': 'Serra', 'Bento Gonçalves': 'Serra',
    'Santa Maria': 'Sul', 'Pelotas': 'Sul',
  };
  const cityRecords = {};
  for (const c of RS_CITIES) {
    const regionName = REGION_BY_CITY[c.name] || 'Vale do Taquari';
    cityRecords[c.name] = await prisma.city.create({
      data: { name: c.name, uf: 'RS', regionId: regions[regionName].id },
    });
  }

  console.log('🔐 Usuários...');
  const hash = (p) => bcrypt.hashSync(p, 10);
  const admin = await prisma.user.create({
    data: { name: 'Coordenação Geral', email: 'admin@airtonartus.com.br', password: hash('Admin@123'), role: 'LIDER', phone: '5551999999999' },
  });
  const coordVale = await prisma.user.create({
    data: { name: 'Coordenação — Vale do Taquari', email: 'vale@airtonartus.com.br', password: hash('Admin@123'), role: 'MEMBRO', regionId: regions['Vale do Taquari'].id, managerId: admin.id },
  });
  const coordMetro = await prisma.user.create({
    data: { name: 'Coordenação — Metropolitana', email: 'metro@airtonartus.com.br', password: hash('Admin@123'), role: 'MEMBRO', regionId: regions['Região Metropolitana'].id, managerId: admin.id },
  });
  const supervisor = await prisma.user.create({
    data: { name: 'Supervisão — Equipe Venâncio', email: 'supervisao@airtonartus.com.br', password: hash('Admin@123'), role: 'MEMBRO', regionId: regions['Vale do Taquari'].id, managerId: coordVale.id },
  });
  await prisma.user.create({ data: { name: 'Parceiro da Campanha', email: 'parceiro@airtonartus.com.br', password: hash('Admin@123'), role: 'PARCEIRO' } });
  await prisma.user.create({ data: { name: 'Equipe — Marketing', email: 'marketing@airtonartus.com.br', password: hash('Admin@123'), role: 'MEMBRO' } });
  await prisma.user.create({ data: { name: 'Equipe — Materiais', email: 'materiais@airtonartus.com.br', password: hash('Admin@123'), role: 'MEMBRO' } });
  await prisma.user.create({ data: { name: 'Equipe — Atendimento', email: 'atendimento@airtonartus.com.br', password: hash('Admin@123'), role: 'MEMBRO' } });
  const coordinators = [coordVale, coordMetro];

  console.log('✅ Tarefas de engajamento...');
  const taskSpec = [
    { type: 'POST_INSTAGRAM', title: 'Publiquei no Instagram', points: 15 },
    { type: 'POST_FACEBOOK', title: 'Publiquei no Facebook', points: 15 },
    { type: 'SHARE_WHATSAPP', title: 'Compartilhei no WhatsApp', points: 10 },
    { type: 'CAMINHADA', title: 'Participei da caminhada', points: 30 },
    { type: 'FAIXA', title: 'Coloquei faixa', points: 25 },
    { type: 'ADESIVOS', title: 'Entreguei adesivos', points: 20 },
    { type: 'CONVIDAR', title: 'Convidei pessoas', points: 10 },
    { type: 'EVENTO', title: 'Compareci ao evento', points: 25 },
  ];
  const tasks = {};
  for (const t of taskSpec) tasks[t.type] = await prisma.task.create({ data: t });

  console.log('📦 Materiais...');
  const materialSpec = [
    { name: 'Faixa 3x1m', category: 'Faixa', unit: 'un', stock: 200 },
    { name: 'Bandeira', category: 'Bandeira', unit: 'un', stock: 300 },
    { name: 'Adesivo de Carro', category: 'Adesivo', unit: 'un', stock: 5000 },
    { name: 'Santinho', category: 'Santinho', unit: 'pacote', stock: 10000 },
    { name: 'Camiseta', category: 'Camiseta', unit: 'un', stock: 500 },
    { name: 'Boné', category: 'Boné', unit: 'un', stock: 400 },
  ];
  for (const m of materialSpec) await prisma.material.create({ data: m });

  console.log('🙋 Apoiadores e voluntários (pré-campanha ativa)...');
  const regionValues = Object.values(regions);
  const volunteers = [];
  const TOTAL = 240;
  for (let i = 0; i < TOTAL; i++) {
    const city = pickCity();
    const region = regions[REGION_BY_CITY[city.name] || 'Vale do Taquari'];
    const supportType = pick(SUPPORT_TYPES);
    const status = pick(STATUSES);
    const coordinator = pick(coordinators);
    const createdAt = recentTs();
    const sup = await prisma.supporter.create({
      data: {
        name: fullName(),
        phone: phone(),
        whatsapp: phone(),
        email: Math.random() > 0.4 ? `apoiador${i}@email.com` : null,
        birthDate: new Date(1955 + Math.floor(rand(0, 50)), Math.floor(rand(0, 12)), Math.floor(rand(1, 28))),
        cep: '95' + Math.floor(rand(100, 999)) + '-000',
        neighborhood: pick(NEIGHBORHOODS),
        cityName: city.name,
        cityId: cityRecords[city.name]?.id || null,
        regionId: region.id,
        lat: jitter(city.lat),
        lng: jitter(city.lng),
        supportType,
        status,
        instagram: Math.random() > 0.6 ? `@${pick(FIRST).toLowerCase()}${i}` : null,
        coordinatorId: coordinator.id,
        createdAt,
      },
    });

    if (supportType === 'VOLUNTARIO') {
      const confirmed = Math.random() > 0.25;
      const totalScore = confirmed ? Math.floor(rand(0, 360)) : 0;
      const v = await prisma.volunteer.create({
        data: {
          supporterId: sup.id,
          active: confirmed,
          confirmed,
          confirmedAt: confirmed ? new Date(createdAt.getTime() + rand(0.1, 2) * DAY) : null,
          confirmationChannel: confirmed ? 'WHATSAPP' : null,
          helpPreference: confirmed ? pick(['Caminhadas', 'Faixa em casa', 'Material digital', 'Eventos']) : null,
          supervisorId: region.name === 'Vale do Taquari' ? supervisor.id : null,
          totalScore,
        },
      });
      volunteers.push(v);
      if (totalScore > 0) {
        const n = Math.floor(rand(1, 6));
        for (let k = 0; k < n; k++) {
          const t = pick(taskSpec);
          await prisma.engagement.create({ data: { volunteerId: v.id, type: t.type, taskId: tasks[t.type].id, points: t.points, validated: Math.random() > 0.35 } });
          await prisma.score.create({ data: { volunteerId: v.id, points: t.points, reason: `Engajamento: ${t.type}`, engagementType: t.type } });
        }
      }
    }
  }

  // SUSPEITO (telefone duplicado) e BLACKLIST — demonstram o antifraude.
  const dupPhone = phone();
  await prisma.supporter.create({ data: { name: 'José Duplicado', phone: dupPhone, status: 'SUSPEITO', flaggedReason: 'Telefone usado em mais de um cadastro.', regionId: regions['Vale do Taquari'].id, cityName: 'Venâncio Aires', neighborhood: 'Centro', lat: jitter(-29.6143), lng: jitter(-52.1932), supportType: 'VOLUNTARIO' } });
  await prisma.supporter.create({ data: { name: 'José Duplicado (2)', phone: dupPhone, status: 'SUSPEITO', flaggedReason: 'Telefone duplicado — já cadastrado.', regionId: regions['Vale do Taquari'].id, cityName: 'Lajeado', neighborhood: 'Florestal', supportType: 'VOLUNTARIO' } });
  await prisma.blacklist.create({ data: { phone: phone(), name: 'Contato Bloqueado', reason: 'Comportamento abusivo em grupos.', createdById: admin.id } });

  console.log('📢 Mural de avisos...');
  await prisma.notice.createMany({
    data: [
      { title: 'Caminhada neste sábado em Venâncio Aires', description: 'Concentração às 9h na Praça da Bandeira. Levem a camiseta da pré-campanha!', type: 'CONVOCACAO', priority: 'ALTA', authorId: coordVale.id },
      { title: 'Agenda da semana', description: 'Reuniões de equipe, visitas ao interior e agenda de saúde. Confira o calendário.', type: 'AGENDA', priority: 'MEDIA', authorId: admin.id },
      { title: 'Novo card para WhatsApp', description: 'Já está disponível no Mídia Kit. Compartilhem!', type: 'AVISO', priority: 'MEDIA', authorId: admin.id, regionId: regions['Região Metropolitana'].id },
    ],
  });

  console.log('🎬 Mídia Kit...');
  await prisma.mediaKit.createMany({
    data: [
      { title: 'Card — Saúde perto de você', description: 'Arte para feed.', type: 'ARTE', network: 'INSTAGRAM', priority: 'ALTA', captionText: 'Meu lado é o da saúde. Airton Artus, pré-candidato a deputado estadual. #AirtonArtus #ValeDoTaquari #RS', hashtags: '#AirtonArtus #ValeDoTaquari #Saúde #RS', guidance: 'Postar entre 18h e 20h.', authorId: admin.id },
      { title: 'Reels — Estradas do Vale', description: 'Vídeo curto de 30s sobre a pavimentação Grão-Pará → Linha Travessa.', type: 'REELS', network: 'INSTAGRAM', priority: 'MEDIA', captionText: 'R$ 10,7 milhões de investimento: 6 km de pavimentação entre Grão-Pará e Linha Travessa.', hashtags: '#ValeDoTaquari #RS', authorId: admin.id },
      { title: 'Áudio oficial da pré-campanha', description: 'Áudio para grupos de WhatsApp.', type: 'JINGLE', network: 'WHATSAPP', priority: 'ALTA', captionText: 'Airton Artus — saúde, trabalho e desenvolvimento para o RS.', authorId: admin.id },
    ],
  });

  console.log('🚩 Faixas em casas...');
  for (let i = 0; i < 22; i++) {
    const city = pickCity();
    await prisma.bannerLocation.create({
      data: {
        responsibleName: fullName(),
        phone: phone(),
        address: `Rua ${pick(LAST)}, ${Math.floor(rand(10, 999))}`,
        cityName: city.name,
        neighborhood: pick(NEIGHBORHOODS),
        lat: jitter(city.lat),
        lng: jitter(city.lng),
        authorized: Math.random() > 0.3,
        status: pick(['AUTORIZADO', 'AGUARDANDO_INSTALACAO', 'INSTALADO', 'INSTALADO']),
      },
    });
  }

  console.log('🚶 Ações de rua...');
  const actionTypes = ['CAMINHADA', 'REUNIAO', 'VISITA', 'EVENTO', 'ENTREGA_MATERIAL', 'CARREATA', 'BANDEIRACO'];
  for (let i = 0; i < 18; i++) {
    const city = pickCity();
    await prisma.streetAction.create({
      data: {
        type: pick(actionTypes),
        title: `Ação em ${city.name}`,
        cityName: city.name,
        neighborhood: pick(NEIGHBORHOODS),
        lat: jitter(city.lat),
        lng: jitter(city.lng),
        date: new Date(NOW - Math.floor(rand(0, 21)) * DAY),
        peopleReached: Math.floor(rand(20, 500)),
        status: pick(['REALIZADA', 'REALIZADA', 'REALIZADA', 'PLANEJADA']),
        coordinatorId: pick(coordinators).id,
        regionId: pick(regionValues).id,
      },
    });
  }

  console.log('📅 Agenda (próximos dias)...');
  await prisma.event.createMany({
    data: [
      { title: 'Caminhada no Centro', location: 'Praça da Bandeira', cityName: 'Venâncio Aires', neighborhood: 'Centro', date: new Date(NOW + 1 * DAY), time: '09:00', status: 'CONFIRMADO', responsibleId: coordVale.id },
      { title: 'Reunião com lideranças da saúde', location: 'Comitê Central', cityName: 'Venâncio Aires', neighborhood: 'Centro', date: new Date(NOW + 2 * DAY), time: '19:30', status: 'CONFIRMADO', responsibleId: admin.id },
      { title: 'Encontro regional em Lajeado', location: 'Centro de Eventos', cityName: 'Lajeado', neighborhood: 'Florestal', date: new Date(NOW + 4 * DAY), time: '17:00', status: 'AGENDADO', responsibleId: coordMetro.id },
      { title: 'Visita à feira do produtor', location: 'Parque do Imigrante', cityName: 'Estrela', neighborhood: 'Centro', date: new Date(NOW + 6 * DAY), time: '08:00', status: 'AGENDADO', responsibleId: coordVale.id },
    ],
  });

  console.log('📨 Demandas da população...');
  const categories = ['SAUDE', 'EDUCACAO', 'INFRAESTRUTURA', 'SEGURANCA', 'EMPREGO', 'TRANSPORTE', 'OUTROS'];
  const demandStatus = ['NOVA', 'NOVA', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDA'];
  for (let i = 0; i < 20; i++) {
    const city = pickCity();
    await prisma.demand.create({
      data: {
        citizenName: fullName(),
        phone: phone(),
        cityName: city.name,
        neighborhood: pick(NEIGHBORHOODS),
        category: pick(categories),
        description: pick(['Falta de médicos no posto de saúde.', 'Fila de espera para exames no hospital regional.', 'Estrada do interior sem manutenção.', 'Ponto de ônibus danificado.', 'Falta de creche no bairro.', 'Coleta de lixo irregular na linha.', 'Iluminação precária na ERS-422.']),
        priority: pick(['BAIXA', 'MEDIA', 'ALTA']),
        status: pick(demandStatus),
        responsibleId: Math.random() > 0.5 ? admin.id : null,
        createdAt: recentTs(),
      },
    });
  }

  console.log('💬 Conversas (atendimento ao vivo)...');
  const convoSpec = [
    { status: 'EM_ATENDIMENTO', name: 'Maria Aparecida', tags: ['voluntária', 'Venâncio Aires'], msgs: [['INBOUND', 'Olá! Quero ajudar na pré-campanha do doutor Airton'], ['OUTBOUND', 'Que ótimo, Maria! Como você prefere ajudar?'], ['INBOUND', 'Posso colocar faixa em casa e divulgar nos grupos']] },
    { status: 'EM_ATENDIMENTO', name: 'Roberto Schmidt', tags: ['apoiador', 'Lajeado'], msgs: [['INBOUND', 'Vocês têm adesivo pra carro?'], ['OUTBOUND', 'Temos sim! Passa seu endereço que enviamos.']] },
    { status: 'AGUARDANDO', name: 'Fernanda Kunzler', tags: ['dúvida'], msgs: [['INBOUND', 'Quando o Airton visita Teutônia?']] },
    { status: 'ABERTA', name: 'Anderson Bortolini', tags: ['evento', 'Estrela'], msgs: [['INBOUND', 'Vai ter encontro aqui em Estrela?']] },
    { status: 'RESOLVIDA', name: 'Patrícia Weber', tags: ['material'], msgs: [['INBOUND', 'Recebi o material, obrigada!'], ['OUTBOUND', 'Nós que agradecemos, Patrícia!']] },
  ];
  for (const c of convoSpec) {
    const last = new Date(NOW - rand(0, 0.2) * DAY);
    await prisma.conversation.create({
      data: {
        channel: 'WHATSAPP', status: c.status, contactName: c.name, contactPhone: phone(),
        tags: c.tags, lastMessageAt: last, agentId: c.status === 'ABERTA' ? null : admin.id,
        messages: {
          create: c.msgs.map(([direction, body], idx) => ({
            direction, body, channel: 'WHATSAPP',
            senderId: direction === 'OUTBOUND' ? admin.id : null,
            createdAt: new Date(last.getTime() - (c.msgs.length - idx) * 60000),
          })),
        },
      },
    });
  }

  console.log('🤖 Automações...');
  await prisma.automation.createMany({
    data: [
      { name: 'Feliz Aniversário', type: 'ANIVERSARIO', message: 'Olá {{nome}}, a equipe do Airton Artus deseja um feliz aniversário!', status: 'ATIVA' },
      { name: 'Boas-vindas Voluntário', type: 'AGRADECIMENTO_VOLUNTARIO', message: 'Obrigado por se juntar a nós, {{nome}}! Juntos somos mais fortes.', status: 'ATIVA' },
      { name: 'Feliz Natal', type: 'NATAL', message: 'Feliz Natal, {{nome}}!', triggerDate: new Date(new Date().getFullYear(), 11, 25), status: 'RASCUNHO' },
    ],
  });

  console.log('📣 Disparos...');
  // Campanha ENVIANDO agora (sensação de tempo real)
  const enviando = await prisma.broadcastCampaign.create({
    data: { name: 'Convite Caminhada — Venâncio Aires', message: 'Olá {{nome}}! Vamos juntos à caminhada em {{cidade}} neste sábado?', channel: 'WHATSAPP', ownerId: coordVale.id, status: 'ENVIANDO' },
  });
  await prisma.broadcastContact.createMany({
    data: Array.from({ length: 60 }).map((_, i) => {
      const city = pickCity();
      const sent = i < 41;
      return { campaignId: enviando.id, name: fullName(), phone: phone(), cityName: city.name, neighborhood: pick(NEIGHBORHOODS), status: sent ? 'ENVIADO' : 'PENDENTE' };
    }),
  });
  await prisma.broadcastCampaign.update({ where: { id: enviando.id }, data: { totalContacts: 60, sentCount: 41, pendingCount: 19 } });

  // Campanha concluída (histórico)
  const concluida = await prisma.broadcastCampaign.create({
    data: { name: 'Boas-vindas novos apoiadores', message: 'Seja bem-vindo(a), {{nome}}! Conte com a gente.', channel: 'WHATSAPP', ownerId: admin.id, status: 'CONCLUIDA', totalContacts: 120, sentCount: 118, failedCount: 2, pendingCount: 0 },
  });
  await prisma.broadcastContact.createMany({
    data: Array.from({ length: 12 }).map(() => ({ campaignId: concluida.id, name: fullName(), phone: phone(), cityName: pickCity().name, neighborhood: pick(NEIGHBORHOODS), status: 'ENVIADO' })),
  });

  console.log('⚙️  Configurações...');
  const settings = [
    { key: 'campaign', value: { name: 'Airton Artus Digital', candidate: 'Airton Artus', office: 'Deputado Estadual', party: 'PDT', number: '12012', city: 'Venâncio Aires', uf: 'RS', slogan: 'Saúde, trabalho e desenvolvimento para o RS' } },
    { key: 'theme', value: { brand: '#1B1D39', green: '#398254', accent: '#E8AF3C' } },
    { key: 'goals', value: { volunteers: 400, supporters: 5000, banners: 300, actions: 120 } },
  ];
  for (const s of settings) await prisma.setting.create({ data: s });

  console.log('\n✅ Seed concluído!');
  console.log('   Login admin: admin@airtonartus.com.br / Admin@123');
  console.log(`   ${volunteers.length} voluntários, ${TOTAL} apoiadores em ${RS_CITIES.length} cidades do RS, atendimentos e disparos criados.\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
