import { brDigits } from '../utils/helpers.js';

// ============================================================
//  Catálogo dos TEMPLATES OFICIAIS aprovados na Meta que podem
//  ser usados em campanhas de disparo (tela Disparador).
//  Fonte da verdade das variáveis — o mesmo objeto alimenta o
//  seletor no frontend (GET /broadcasts/templates) e a montagem
//  do payload no envio. Manter em sincronia com a Meta.
//
//  vars[]: ordem = {{1}}, {{2}}, ... no corpo do template.
//    - { key, auto:true }  -> preenchido por contato (nome)
//    - { key, label, placeholder } -> valor fixo da campanha
//  button: null | { type:'url', source:'contactPhone' } (parâmetro
//    dinâmico do botão de URL — usamos o telefone como token).
// ============================================================

export const CAMPAIGN_TEMPLATES = [
  {
    name: 'airton_bem_vindo',
    label: 'Boas-vindas',
    category: 'MARKETING',
    description: 'Dá as boas-vindas e convida a acessar a plataforma.',
    vars: [{ key: 'nome', auto: true }],
    preview:
      'Olá, {nome}! Seu cadastro na plataforma da campanha de Airton Artus foi aprovado. Que bom ter você com a gente! Acesse a plataforma no botão abaixo.',
    button: null,
  },
  {
    name: 'airton_agradecimento',
    label: 'Agradecimento',
    category: 'MARKETING',
    description: 'Agradece o apoio e a dedicação.',
    vars: [{ key: 'nome', auto: true }],
    preview:
      'Olá, {nome}! A equipe de Airton Artus agradece de coração o seu apoio e a sua dedicação à nossa campanha. Juntos somos mais fortes. Muito obrigado!',
    button: null,
  },
  {
    name: 'airton_aniversario',
    label: 'Aniversário',
    category: 'MARKETING',
    description: 'Mensagem de feliz aniversário.',
    vars: [{ key: 'nome', auto: true }],
    preview:
      'Olá, {nome}! A equipe de Airton Artus deseja a você um feliz aniversário, com muita saúde e alegria. Conte sempre com a gente!',
    button: null,
  },
  {
    name: 'airton_convite_evento',
    label: 'Convite para evento',
    category: 'MARKETING',
    description: 'Convida os contatos para um evento (com botão de confirmar presença).',
    vars: [
      { key: 'nome', auto: true },
      { key: 'evento', label: 'Nome do evento', placeholder: 'Caminhada pela Saúde' },
      { key: 'data', label: 'Data e hora', placeholder: '20/09 às 15h' },
      { key: 'local', label: 'Local', placeholder: 'Praça da Matriz, Venâncio Aires' },
    ],
    preview:
      'Olá, {nome}! Você está convidado(a) para {evento}, no dia {data}, em {local}. Sua presença é muito importante pra nós. Confirme no botão abaixo!',
    button: { type: 'url', source: 'contactPhone' },
  },
  {
    name: 'airton_lembrete_evento',
    label: 'Lembrete de evento',
    category: 'UTILITY',
    description: 'Lembra os contatos de um evento que acontece hoje.',
    vars: [
      { key: 'nome', auto: true },
      { key: 'evento', label: 'Nome do evento', placeholder: 'Caminhada pela Saúde' },
      { key: 'hora', label: 'Horário', placeholder: '15h' },
      { key: 'local', label: 'Local', placeholder: 'Praça da Matriz, Venâncio Aires' },
    ],
    preview:
      'Olá, {nome}! Passando pra lembrar do evento {evento}, hoje às {hora}, em {local}. Contamos com a sua presença!',
    button: null,
  },
];

const LANG = 'pt_BR';

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'tudo bem';
}

/** Acha o template do catálogo pelo nome (ou null). */
export function findTemplate(name) {
  return CAMPAIGN_TEMPLATES.find((t) => t.name === name) || null;
}

/** Rende a prévia (com {nome}, {evento}...) substituindo os valores fixos da campanha. */
export function renderPreview(tpl, vars = {}) {
  return (tpl.preview || '').replace(/\{(\w+)\}/g, (_, k) => {
    const v = tpl.vars.find((x) => x.key === k);
    if (v?.auto) return '{nome}';
    return vars[k] || `{${k}}`;
  });
}

/**
 * Monta o objeto `template` do WhatsApp Cloud API para um contato específico.
 * @param tpl catálogo (findTemplate)
 * @param contact { name, phone }
 * @param vars valores fixos da campanha (evento/data/local...)
 */
export function buildTemplatePayload(tpl, contact, vars = {}) {
  const bodyParams = tpl.vars.map((v) => {
    const text = v.auto ? firstName(contact.name) : String(vars[v.key] || '').trim();
    return { type: 'text', text: text || ' ' };
  });
  const components = [{ type: 'body', parameters: bodyParams }];
  if (tpl.button?.type === 'url') {
    const token = tpl.button.source === 'contactPhone' ? brDigits(contact.phone) : 'base';
    components.push({ type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: token }] });
  }
  return { name: tpl.name, language: { code: LANG }, components };
}
