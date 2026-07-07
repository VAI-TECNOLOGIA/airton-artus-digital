import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const rand = (min, max) => Math.random() * (max - min) + min;
const jitter = (base, range = 0.05) => base + rand(-range, range);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const phone = () => '5548' + String(Math.floor(90000000 + Math.random() * 9999999));
const NOW = Date.now();
const DAY = 86400000;

// Timestamp recente com peso para "agora" — dá sensação de campanha em tempo real.
function recentTs() {
  const r = Math.random();
  let daysAgo;
  if (r < 0.16) daysAgo = rand(0, 0.03);       // última ~40min
  else if (r < 0.5) daysAgo = rand(0, 2);       // últimos 2 dias
  else if (r < 0.82) daysAgo = rand(2, 9);      // última semana+
  else daysAgo = rand(9, 24);                   // até ~3 semanas
  return new Date(NOW - daysAgo * DAY);
}

// Cidades de Santa Catarina com coordenadas (batem com o mapa do painel) + peso.
const SC_CITIES = [
  { name: 'Florianópolis', lat: -27.5954, lng: -48.5480, w: 26 },
  { name: 'Joinville', lat: -26.3045, lng: -48.8487, w: 14 },
  { name: 'Blumenau', lat: -26.9194, lng: -49.0661, w: 11 },
  { name: 'São José', lat: -27.5969, lng: -48.6394, w: 9 },
  { name: 'Itajaí', lat: -26.9078, lng: -48.6619, w: 7 },
  { name: 'Criciúma', lat: -28.6775, lng: -49.3695, w: 6 },
  { name: 'Chapecó', lat: -27.1004, lng: -52.6152, w: 6 },
  { name: 'Balneário Camboriú', lat: -26.9926, lng: -48.6349, w: 5 },
  { name: 'Jaraguá do Sul', lat: -26.4851, lng: -49.0667, w: 5 },
  { name: 'Palhoça', lat: -27.6386, lng: -48.6703, w: 5 },
  { name: 'Lages', lat: -27.8161, lng: -50.3259, w: 4 },
  { name: 'Brusque', lat: -27.0980, lng: -48.9177, w: 4 },
  { name: 'Itapema', lat: -27.0902, lng: -48.6114, w: 3 },
  { name: 'Tubarão', lat: -28.4666, lng: -49.0069, w: 3 },
  { name: 'Camboriú', lat: -27.0246, lng: -48.6586, w: 3 },
  { name: 'Navegantes', lat: -26.8990, lng: -48.6544, w: 3 },
  { name: 'Concórdia', lat: -27.2338, lng: -52.0278, w: 2 },
  { name: 'Rio do Sul', lat: -27.2148, lng: -49.6431, w: 2 },
  { name: 'Araranguá', lat: -28.9350, lng: -49.4916, w: 2 },
  { name: 'Gaspar', lat: -26.9317, lng: -48.9585, w: 2 },
  { name: 'Indaial', lat: -26.8978, lng: -49.2318, w: 2 },
  { name: 'Biguaçu', lat: -27.4939, lng: -48.6558, w: 2 },
  { name: 'São Bento do Sul', lat: -26.2503, lng: -49.3783, w: 2 },
  { name: 'Caçador', lat: -26.7753, lng: -51.0148, w: 2 },
];
const CITY_BAG = SC_CITIES.flatMap((c) => Array(c.w).fill(c));
const pickCity = () => pick(CITY_BAG);

const NEIGHBORHOODS = [
  'Centro', 'Trindade', 'Ingleses', 'Canasvieiras', 'Campeche', 'Lagoa da Conceição', 'Estreito',
  'Coqueiros', 'Capoeiras', 'Kobrasol', 'Campinas', 'Barreiros', 'Santa Mônica', 'Córrego Grande',
  'Itacorubi', 'Agronômica', 'Saco Grande', 'Rio Vermelho', 'Jurerê', 'Vila Nova', 'Garcia', 'Velha',
  'América', 'Bucarein', 'Costa e Silva', 'Glória', 'Iririú', 'Ponta Aguda', 'Victor Konder', 'Nova Brasília',
];
const FIRST = ['Ana', 'Carlos', 'Mariana', 'João', 'Patrícia', 'Rafael', 'Juliana', 'Bruno', 'Fernanda', 'Lucas', 'Camila', 'Diego', 'Aline', 'Marcelo', 'Bianca', 'Rodrigo', 'Letícia', 'Felipe', 'Gabriela', 'Thiago', 'Sabrina', 'Vinícius', 'Débora', 'Anderson', 'Priscila', 'Everton'];
const LAST = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Lima', 'Costa', 'Martins', 'Rocha', 'Almeida', 'Nunes', 'Gomes', 'Ribeiro', 'Carvalho', 'Fernandes', 'Cardoso', 'Schmitt', 'Koerich', 'Búrigo', 'Effting'];
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

  console.log('🗺️  Regiões e cidades...');
  const regionsSpec = [
    { name: 'Grande Florianópolis', color: '#F2663C' },
    { name: 'Norte', color: '#1A1D21' },
    { name: 'Vale do Itajaí', color: '#E0521F' },
    { name: 'Sul', color: '#3A3F47' },
    { name: 'Oeste', color: '#BC4019' },
  ];
  const regions = {};
  for (const r of regionsSpec) {
    regions[r.name] = await prisma.region.create({ data: { name: r.name, uf: 'SC', color: r.color } });
  }

  const capital = await prisma.city.create({ data: { name: 'Florianópolis', uf: 'SC', regionId: regions['Grande Florianópolis'].id } });
  await prisma.city.createMany({
    data: [
      { name: 'Joinville', uf: 'SC', regionId: regions['Norte'].id },
      { name: 'Blumenau', uf: 'SC', regionId: regions['Vale do Itajaí'].id },
      { name: 'São José', uf: 'SC', regionId: regions['Grande Florianópolis'].id },
      { name: 'Criciúma', uf: 'SC', regionId: regions['Sul'].id },
      { name: 'Chapecó', uf: 'SC', regionId: regions['Oeste'].id },
    ],
  });

  console.log('🔐 Usuários...');
  const hash = (p) => bcrypt.hashSync(p, 10);
  const admin = await prisma.user.create({
    data: { name: 'Líder de Campanha', email: 'admin@demo.com', password: hash('Admin@123'), role: 'LIDER', phone: '5548999999999' },
  });
  const coordNorte = await prisma.user.create({
    data: { name: 'Coordenador — Norte', email: 'norte@demo.com', password: hash('Admin@123'), role: 'MEMBRO', regionId: regions['Norte'].id, managerId: admin.id },
  });
  const coordSul = await prisma.user.create({
    data: { name: 'Coordenador — Sul', email: 'sul@demo.com', password: hash('Admin@123'), role: 'MEMBRO', regionId: regions['Sul'].id, managerId: admin.id },
  });
  const supervisor = await prisma.user.create({
    data: { name: 'Supervisor — Equipe A', email: 'supervisor@demo.com', password: hash('Admin@123'), role: 'MEMBRO', regionId: regions['Norte'].id, managerId: coordNorte.id },
  });
  await prisma.user.create({ data: { name: 'Parceiro Demo', email: 'parceiro@demo.com', password: hash('Admin@123'), role: 'PARCEIRO' } });
  await prisma.user.create({ data: { name: 'Membro — Marketing', email: 'marketing@demo.com', password: hash('Admin@123'), role: 'MEMBRO' } });
  await prisma.user.create({ data: { name: 'Membro — Materiais', email: 'materiais@demo.com', password: hash('Admin@123'), role: 'MEMBRO' } });
  await prisma.user.create({ data: { name: 'Membro — Atendimento', email: 'atendimento@demo.com', password: hash('Admin@123'), role: 'MEMBRO' } });
  const coordinators = [coordNorte, coordSul];

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

  console.log('🙋 Apoiadores e voluntários (campanha ativa)...');
  const regionValues = Object.values(regions);
  const volunteers = [];
  const TOTAL = 240;
  for (let i = 0; i < TOTAL; i++) {
    const city = pickCity();
    const region = pick(regionValues);
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
        birthDate: new Date(1970 + Math.floor(rand(0, 35)), Math.floor(rand(0, 12)), Math.floor(rand(1, 28))),
        cep: '880' + Math.floor(rand(10, 99)) + '-000',
        neighborhood: pick(NEIGHBORHOODS),
        cityName: city.name,
        cityId: city.name === 'Florianópolis' ? capital.id : null,
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
          supervisorId: region.name === 'Norte' ? supervisor.id : null,
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

  // SUSPEITO (telefone duplicado) e BLACKLIST
  const dupPhone = phone();
  await prisma.supporter.create({ data: { name: 'José Duplicado', phone: dupPhone, status: 'SUSPEITO', flaggedReason: 'Telefone usado em mais de um cadastro.', regionId: regions['Grande Florianópolis'].id, cityName: 'Florianópolis', neighborhood: 'Centro', lat: jitter(-27.5954), lng: jitter(-48.5480), supportType: 'VOLUNTARIO' } });
  await prisma.supporter.create({ data: { name: 'José Duplicado (2)', phone: dupPhone, status: 'SUSPEITO', flaggedReason: 'Telefone duplicado — já cadastrado.', regionId: regions['Grande Florianópolis'].id, cityName: 'São José', neighborhood: 'Kobrasol', supportType: 'VOLUNTARIO' } });
  await prisma.blacklist.create({ data: { phone: phone(), name: 'Contato Bloqueado', reason: 'Comportamento abusivo em grupos.', createdById: admin.id } });

  console.log('📢 Mural de avisos...');
  await prisma.notice.createMany({
    data: [
      { title: 'Caminhada neste sábado', description: 'Concentração às 9h na Beira-Mar Norte. Levem a camiseta da campanha!', type: 'CONVOCACAO', priority: 'ALTA', authorId: coordNorte.id },
      { title: 'Agenda da semana', description: 'Reuniões de equipe, visitas e bandeiraço. Confira o calendário.', type: 'AGENDA', priority: 'MEDIA', authorId: admin.id },
      { title: 'Novo card para WhatsApp', description: 'Já está disponível no Mídia Kit. Compartilhem!', type: 'AVISO', priority: 'MEDIA', authorId: admin.id, regionId: regions['Sul'].id },
    ],
  });

  console.log('🎬 Mídia Kit...');
  await prisma.mediaKit.createMany({
    data: [
      { title: 'Card — Saúde nos bairros', description: 'Arte para feed.', type: 'ARTE', network: 'INSTAGRAM', priority: 'ALTA', captionText: 'Saúde de qualidade perto de você! 💚 #CandidatoDEMO #SantaCatarina #PartidoTeste', hashtags: '#CandidatoDEMO #SantaCatarina #Saúde #PartidoTeste', guidance: 'Postar entre 18h e 20h.', authorId: admin.id },
      { title: 'Reels — Infraestrutura', description: 'Vídeo curto de 30s.', type: 'REELS', network: 'INSTAGRAM', priority: 'MEDIA', captionText: 'Obras que transformam bairros. 🚧', hashtags: '#Infraestrutura #SC', authorId: admin.id },
      { title: 'Jingle oficial', description: 'Áudio para grupos de WhatsApp.', type: 'JINGLE', network: 'WHATSAPP', priority: 'ALTA', captionText: 'É Candidato Teste — Partido Teste!', authorId: admin.id },
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
      { title: 'Caminhada na Beira-Mar', location: 'Av. Beira-Mar Norte', cityName: 'Florianópolis', neighborhood: 'Centro', date: new Date(NOW + 1 * DAY), time: '09:00', status: 'CONFIRMADO', responsibleId: coordNorte.id },
      { title: 'Reunião com lideranças', location: 'Comitê Central', cityName: 'Florianópolis', neighborhood: 'Trindade', date: new Date(NOW + 2 * DAY), time: '19:30', status: 'CONFIRMADO', responsibleId: admin.id },
      { title: 'Bandeiraço em São José', location: 'Terminal do Kobrasol', cityName: 'São José', neighborhood: 'Kobrasol', date: new Date(NOW + 4 * DAY), time: '17:00', status: 'AGENDADO', responsibleId: coordSul.id },
      { title: 'Visita à feira', location: 'Feira do Centro', cityName: 'Itajaí', neighborhood: 'Centro', date: new Date(NOW + 6 * DAY), time: '08:00', status: 'AGENDADO', responsibleId: coordNorte.id },
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
        description: pick(['Falta de iluminação na rua.', 'Posto de saúde sem médicos.', 'Buraco na via há meses.', 'Ponto de ônibus danificado.', 'Praça abandonada.', 'Falta de creche no bairro.', 'Coleta de lixo irregular.']),
        priority: pick(['BAIXA', 'MEDIA', 'ALTA']),
        status: pick(demandStatus),
        responsibleId: Math.random() > 0.5 ? admin.id : null,
        createdAt: recentTs(),
      },
    });
  }

  console.log('💬 Conversas (atendimento ao vivo)...');
  const convoSpec = [
    { status: 'EM_ATENDIMENTO', name: 'Maria Aparecida', tags: ['voluntária', 'Florianópolis'], msgs: [['INBOUND', 'Olá! Quero ajudar na campanha 😊'], ['OUTBOUND', 'Que ótimo, Maria! Como você prefere ajudar?'], ['INBOUND', 'Posso colocar faixa em casa e panfletar 🙌']] },
    { status: 'EM_ATENDIMENTO', name: 'Roberto Schmitt', tags: ['apoiador', 'Joinville'], msgs: [['INBOUND', 'Vocês têm adesivo pra carro?'], ['OUTBOUND', 'Temos sim! Passa seu endereço que enviamos.']] },
    { status: 'AGUARDANDO', name: 'Fernanda Koerich', tags: ['dúvida'], msgs: [['INBOUND', 'Qual o número do candidato mesmo?']] },
    { status: 'ABERTA', name: 'Anderson Búrigo', tags: ['evento', 'Criciúma'], msgs: [['INBOUND', 'Vai ter caminhada aqui no Sul?']] },
    { status: 'RESOLVIDA', name: 'Patrícia Effting', tags: ['material'], msgs: [['INBOUND', 'Recebi o material, obrigada!'], ['OUTBOUND', 'Nós que agradecemos, Patrícia! 💪']] },
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
      { name: 'Feliz Aniversário', type: 'ANIVERSARIO', message: 'Olá {{nome}}, a campanha do Candidato Teste deseja um feliz aniversário! 🎂', status: 'ATIVA' },
      { name: 'Boas-vindas Voluntário', type: 'AGRADECIMENTO_VOLUNTARIO', message: 'Obrigado por se juntar a nós, {{nome}}! Juntos somos mais fortes. 💪', status: 'ATIVA' },
      { name: 'Feliz Natal', type: 'NATAL', message: 'Feliz Natal, {{nome}}! 🎄', triggerDate: new Date(new Date().getFullYear(), 11, 25), status: 'RASCUNHO' },
    ],
  });

  console.log('📣 Disparos...');
  // Campanha ENVIANDO agora (sensação de tempo real)
  const enviando = await prisma.broadcastCampaign.create({
    data: { name: 'Convite Caminhada Beira-Mar', message: 'Olá {{nome}}! Vamos juntos à caminhada em {{cidade}} neste sábado? 🚶', channel: 'WHATSAPP', ownerId: coordNorte.id, status: 'ENVIANDO' },
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
    data: { name: 'Boas-vindas novos apoiadores', message: 'Seja bem-vindo(a), {{nome}}! Conte com a gente. 🙌', channel: 'WHATSAPP', ownerId: admin.id, status: 'CONCLUIDA', totalContacts: 120, sentCount: 118, failedCount: 2, pendingCount: 0 },
  });
  await prisma.broadcastContact.createMany({
    data: Array.from({ length: 12 }).map(() => ({ campaignId: concluida.id, name: fullName(), phone: phone(), cityName: pickCity().name, neighborhood: pick(NEIGHBORHOODS), status: 'ENVIADO' })),
  });

  console.log('⚙️  Configurações...');
  const settings = [
    { key: 'campaign', value: { name: 'Campanha DEMO', candidate: 'Candidato Teste', office: 'Vereador', party: 'Partido Teste', number: '00', city: 'Florianópolis', uf: 'SC', slogan: 'Juntos por você, pela sua cidade' } },
    { key: 'theme', value: { brand: '#F2663C', green: '#1B7A43', accent: '#F4794F' } },
    { key: 'goals', value: { volunteers: 150, supporters: 800, banners: 120, actions: 60 } },
  ];
  for (const s of settings) await prisma.setting.create({ data: s });

  console.log('\n✅ Seed concluído!');
  console.log('   Login admin: admin@demo.com / Admin@123');
  console.log(`   ${volunteers.length} voluntários, ${TOTAL} apoiadores em ${SC_CITIES.length} cidades de SC, atendimentos e disparos criados.\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
