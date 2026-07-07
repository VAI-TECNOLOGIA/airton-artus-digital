import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

// ============================================================
//  Assistente de IA da campanha.
//  Config em Setting key='ai' = { enabled, provider, token, model }.
//  provider: 'openai' | 'anthropic'. O token NUNCA sai do servidor.
//  O contexto entregue ao modelo é FILTRADO pelo papel do usuário —
//  é assim que a IA "respeita a permissão de cada um".
// ============================================================

const DEFAULT_MODEL = { openai: 'gpt-4o-mini', anthropic: 'claude-3-5-haiku-20241022' };

export async function getAiConfig() {
  const row = await prisma.setting.findUnique({ where: { key: 'ai' } });
  const v = row?.value || {};
  return {
    enabled: !!v.enabled,
    provider: v.provider || 'openai',
    token: v.token || '',
    model: v.model || DEFAULT_MODEL[v.provider || 'openai'],
  };
}

/** Status sem vazar o token — usado pelo frontend p/ saber se pode usar a IA. */
export async function getAiStatus() {
  const c = await getAiConfig();
  return { enabled: c.enabled, provider: c.provider, model: c.model, hasToken: !!c.token };
}

const ROLE_LABEL = { LIDER: 'Líder de Campanha', MEMBRO: 'Membro da Equipe', PARCEIRO: 'Parceiro' };

// O que cada papel pode "ver" — usado no prompt e para filtrar o contexto.
const ROLE_SCOPE = {
  LIDER: 'Acesso total: base de apoiadores/voluntários, suspeitos, blacklist, mapa, relatórios, comunicação, disparos, automações, usuários, configurações e metas.',
  MEMBRO: 'Equipe interna: apoiadores, voluntários, mapa, ações de rua, faixas, materiais, conversas, demandas e mídia kit. NÃO tem acesso a: suspeitos, blacklist, usuários, configurações, tokens e finanças.',
  PARCEIRO: 'Parceiro externo: apenas mídia kit, suas tarefas de engajamento, agenda e pedidos de material. NÃO tem acesso à base de apoiadores, relatórios, comunicação interna nem administração.',
};

/** Snapshot de dados FILTRADO pelo papel — a IA só recebe o que o usuário pode ver. */
async function buildContext(user) {
  const ctx = {};
  const [campaign, goals] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'campaign' } }),
    prisma.setting.findUnique({ where: { key: 'goals' } }),
  ]);
  ctx.campanha = campaign?.value || {};
  ctx.metas = goals?.value || {};

  if (user.role === 'LIDER' || user.role === 'MEMBRO') {
    const [supporters, volunteers, banners, actions, demands, topRegions] = await Promise.all([
      prisma.supporter.count(),
      prisma.volunteer.count(),
      prisma.bannerLocation.count({ where: { status: { in: ['AUTORIZADO', 'INSTALADO'] } } }),
      prisma.streetAction.count(),
      prisma.demand.count({ where: { status: { in: ['NOVA', 'EM_ANALISE', 'EM_ANDAMENTO'] } } }),
      prisma.region.findMany({
        select: { name: true, _count: { select: { supporters: true } } },
        orderBy: { supporters: { _count: 'desc' } },
        take: 5,
      }),
    ]);
    ctx.totais = { apoiadores: supporters, voluntarios: volunteers, faixas_ativas: banners, acoes_de_rua: actions, demandas_abertas: demands };
    ctx.regioes_top = topRegions.map((r) => ({ regiao: r.name, apoiadores: r._count.supporters }));
  }

  if (user.role === 'LIDER') {
    const [suspects, blacklist, users] = await Promise.all([
      prisma.supporter.count({ where: { status: 'SUSPEITO' } }),
      prisma.blacklist.count(),
      prisma.user.count(),
    ]);
    ctx.gestao = { suspeitos: suspects, blacklist, usuarios: users };
  }

  if (user.role === 'PARCEIRO') {
    const engagements = await prisma.engagement.count({ where: { userId: user.id } });
    ctx.meus_dados = { minhas_tarefas_registradas: engagements };
  }

  return ctx;
}

function systemPrompt(user, ctx) {
  const camp = ctx.campanha || {};
  return [
    `Você é o assistente de IA da plataforma "Campanha DEMO", sistema de gestão da campanha de ${camp.candidate || 'Candidato Teste'} (${camp.office || 'Vereador'}, ${camp.party || 'Partido Teste'}, nº ${camp.number || '00'}).`,
    `Fale sempre em português do Brasil, de forma prática, objetiva e cordial — como um chefe de gabinete digital.`,
    ``,
    `USUÁRIO ATUAL: ${user.name} · perfil "${ROLE_LABEL[user.role] || user.role}".`,
    `PERMISSÃO DESTE PERFIL: ${ROLE_SCOPE[user.role] || 'acesso restrito.'}`,
    ``,
    `REGRAS DE PERMISSÃO (obrigatórias):`,
    `- Responda apenas com base nos DADOS DE CONTEXTO abaixo, que já vêm filtrados para o perfil deste usuário.`,
    `- Se perguntarem algo fora da permissão do perfil (ex.: um PARCEIRO pedindo a base de apoiadores, ou um MEMBRO pedindo blacklist/usuários), recuse com gentileza e explique que aquele dado é restrito ao perfil dele — não invente números.`,
    `- Nunca revele tokens, senhas ou configurações sensíveis.`,
    `- Se não tiver o dado no contexto, diga que não tem essa informação disponível no momento.`,
    ``,
    `DADOS DE CONTEXTO (JSON, já filtrados por permissão):`,
    JSON.stringify(ctx, null, 2),
  ].join('\n');
}

async function callOpenAI({ token, model, system, messages }) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new AppError(`Provedor de IA recusou (OpenAI): ${data?.error?.message || resp.status}`, 502);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropic({ token, model, system, messages }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': token,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system,
      messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new AppError(`Provedor de IA recusou (Anthropic): ${data?.error?.message || resp.status}`, 502);
  return (data.content || []).map((b) => b.text).join('').trim();
}

/** Conversa com a IA respeitando a permissão do usuário. `messages` = histórico [{role,content}]. */
export async function chatWithAI({ user, messages }) {
  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.token) {
    throw new AppError('A IA ainda não foi ativada. Peça ao líder para configurar o token em Configurações.', 400);
  }
  const ctx = await buildContext(user);
  const system = systemPrompt(user, ctx);
  const history = (messages || []).slice(-12).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 4000),
  }));

  const reply =
    cfg.provider === 'anthropic'
      ? await callAnthropic({ token: cfg.token, model: cfg.model, system, messages: history })
      : await callOpenAI({ token: cfg.token, model: cfg.model, system, messages: history });

  return { reply: reply || 'Não consegui gerar uma resposta agora. Tente novamente.' };
}
