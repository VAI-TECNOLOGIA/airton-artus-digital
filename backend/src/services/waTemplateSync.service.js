import prisma from '../config/prisma.js';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { CAMPAIGN_TEMPLATES, findTemplate } from '../config/waTemplates.js';
import { saveBufferToUploads } from '../middlewares/upload.js';

// ============================================================
//  Sincronização de TEMPLATES OFICIAIS da Meta (WhatsApp Cloud
//  API) para o banco. O botão "Sincronizar templates" chama
//  syncWaTemplates(): busca GET /{WABA}/message_templates,
//  faz o parse (variáveis, botão, prévia) e faz upsert em
//  WaTemplate. O seletor do Disparador passa a ler daqui.
//
//  Metadados curados do config (waTemplates.js) têm prioridade
//  para os templates já conhecidos (rótulos/placeholders bonitos);
//  templates novos ganham rótulo/variáveis derivados do corpo.
// ============================================================

const GRAPH = 'https://graph.facebook.com';

function ver() {
  return env.whatsapp.graphVersion || 'v20.0';
}

async function graphGet(path) {
  const token = env.whatsapp.token;
  const url = `${GRAPH}/${ver()}/${path}${path.includes('?') ? '&' : '?'}access_token=${token}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data?.error) {
    const e = data.error;
    throw new AppError(`Meta: ${e.message} (código ${e.code})`, 502);
  }
  return data;
}

/**
 * Resolve o ID da conta do WhatsApp Business (WABA).
 * 1) env WHATSAPP_WABA_ID (recomendado);
 * 2) me/assigned_whatsapp_business_accounts (quando a WABA está
 *    atribuída ao usuário de sistema do token).
 */
export async function resolveWabaId() {
  if (env.whatsapp.wabaId) return env.whatsapp.wabaId;
  try {
    const data = await graphGet('me/assigned_whatsapp_business_accounts?fields=id,name&limit=1');
    const id = data?.data?.[0]?.id;
    if (id) return id;
  } catch {
    /* segue para o erro abaixo */
  }
  throw new AppError(
    'WABA não configurada. Defina WHATSAPP_WABA_ID no servidor (ID da conta do WhatsApp Business, disponível no WhatsApp Manager da Meta).',
    400,
  );
}

const GREETING = /(ol[áa]|oi|prezad[oa]s?|car[oa]s?|bom dia|boa tarde|boa noite)[,!.\s]*$/i;

function humanizeLabel(name) {
  return String(name)
    .replace(/^airton[_-]?/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || name;
}

/** Índices {{n}} distintos presentes no texto, em ordem numérica. */
function varIndexes(text) {
  const set = new Set();
  for (const m of String(text || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)) set.add(Number(m[1]));
  return [...set].sort((a, b) => a - b);
}

/**
 * Deriva a lista de variáveis de um template novo (sem config curado).
 * A 1ª variável é tratada como {nome} automático quando vem logo após
 * uma saudação ("Olá, {{1}}"); as demais viram campos fixos da campanha.
 */
function deriveVars(bodyText) {
  const idxs = varIndexes(bodyText);
  return idxs.map((n, i) => {
    if (i === 0) {
      const before = String(bodyText).split(/\{\{\s*\d+\s*\}\}/)[0];
      if (GREETING.test(before)) return { key: 'nome', auto: true };
    }
    return { key: `var${n}`, label: `Variável ${n}`, placeholder: '' };
  });
}

/** Converte o corpo ({{1}}, {{2}}...) para a prévia com {key} do front. */
function buildPreview(bodyText, vars) {
  let i = 0;
  return String(bodyText || '').replace(/\{\{\s*\d+\s*\}\}/g, () => {
    const v = vars[i++];
    return v ? `{${v.key}}` : '';
  });
}

/** Detecta botão com parâmetro dinâmico de URL (usamos o telefone como token). */
function deriveButton(components) {
  const btns = components.find((c) => c.type === 'BUTTONS')?.buttons || [];
  const urlBtn = btns.find((b) => b.type === 'URL' && /\{\{\s*\d+\s*\}\}/.test(b.url || ''));
  if (urlBtn) return { type: 'url', source: 'contactPhone' };
  return null;
}

const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp' };

/**
 * Baixa a imagem de exemplo do cabeçalho (header_handle da Meta, que expira)
 * e re-hospeda num link ESTÁVEL do próprio servidor — é esse link que vai no
 * disparo. Idempotente: se já existe headerSampleUrl no banco, reaproveita.
 */
async function ensureHeaderImage(name, headerComp, existingUrl) {
  if (existingUrl) return existingUrl;
  const handle = headerComp?.example?.header_handle?.[0];
  if (!handle) return null;
  try {
    const r = await fetch(handle);
    if (!r.ok) return null;
    const mime = r.headers.get('content-type') || 'image/png';
    const ext = EXT_BY_MIME[mime.split(';')[0]] || 'png';
    const buf = Buffer.from(await r.arrayBuffer());
    return await saveBufferToUploads(buf, `wa-header-${name}.${ext}`);
  } catch {
    return null;
  }
}

/** Parseia um template cru da Meta para a forma usada no app. */
export function parseMetaTemplate(t) {
  const components = t.components || [];
  const bodyText = components.find((c) => c.type === 'BODY')?.text || '';
  const headerComp = components.find((c) => c.type === 'HEADER');
  const headerFormat = headerComp?.format || 'NONE';
  const cfg = findTemplate(t.name); // metadados curados, se existirem

  let vars, button, label, description, preview;
  if (cfg) {
    vars = cfg.vars;
    button = cfg.button || null;
    label = cfg.label;
    description = cfg.description;
    preview = cfg.preview;
  } else {
    vars = deriveVars(bodyText);
    button = deriveButton(components);
    label = humanizeLabel(t.name);
    const cat = t.category === 'UTILITY' ? 'Utilidade' : t.category === 'AUTHENTICATION' ? 'Autenticação' : 'Marketing';
    description = `Modelo aprovado na Meta (${cat}).`;
    preview = buildPreview(bodyText, vars);
  }

  return {
    name: t.name,
    language: t.language || 'pt_BR',
    status: t.status || 'UNKNOWN',
    category: t.category || null,
    label,
    description,
    headerFormat,
    headerComp, // cru — usado no sync p/ baixar a imagem de exemplo
    bodyText,
    previewText: preview,
    varsJson: vars,
    buttonJson: button,
    rawJson: components,
  };
}

/** Forma consumida pelo controller/seletor a partir de uma linha do banco. */
export function shapeFromRow(row) {
  return {
    name: row.name,
    label: row.label || row.name,
    category: row.category || 'MARKETING',
    description: row.description || '',
    language: row.language || 'pt_BR',
    vars: row.varsJson || [],
    button: row.buttonJson || null,
    preview: row.previewText || '',
    status: row.status,
    header: { format: row.headerFormat || 'NONE', sample: row.headerSampleUrl || null },
  };
}

/**
 * Resolve um template pelo nome: banco (sincronizado) primeiro,
 * caindo no catálogo do código (compatibilidade / antes do 1º sync).
 */
export async function getTemplateShape(name) {
  if (!name) return null;
  const row = await prisma.waTemplate.findUnique({ where: { name } });
  if (row) return shapeFromRow(row);
  return findTemplate(name);
}

/**
 * Busca todos os templates da WABA (com paginação) e faz upsert no banco.
 * @returns { total, approved, created, updated, names }
 */
export async function syncWaTemplates() {
  if (env.whatsapp.provider !== 'meta_cloud' || !env.whatsapp.token) {
    throw new AppError('WhatsApp oficial não está conectado (WHATSAPP_PROVIDER/TOKEN).', 400);
  }
  const waba = await resolveWabaId();

  const all = [];
  let path = `${waba}/message_templates?fields=name,status,category,language,components&limit=100`;
  let guard = 0;
  while (path && guard++ < 20) {
    const page = await graphGet(path);
    all.push(...(page.data || []));
    const next = page.paging?.next;
    // paging.next é uma URL completa; extrai só o que vem depois da versão.
    path = next ? next.split(`/${ver()}/`)[1] : null;
  }

  let created = 0;
  let updated = 0;
  for (const t of all) {
    const shaped = parseMetaTemplate(t);
    const existing = await prisma.waTemplate.findUnique({ where: { name: shaped.name } });

    // Cabeçalho de imagem: re-hospeda a arte aprovada num link estável (reaproveita se já tiver).
    let headerSampleUrl = existing?.headerSampleUrl || null;
    if (shaped.headerFormat === 'IMAGE') {
      headerSampleUrl = await ensureHeaderImage(shaped.name, shaped.headerComp, headerSampleUrl);
    }

    const data = {
      language: shaped.language,
      status: shaped.status,
      category: shaped.category,
      label: shaped.label,
      description: shaped.description,
      headerFormat: shaped.headerFormat,
      headerSampleUrl,
      bodyText: shaped.bodyText,
      previewText: shaped.previewText,
      varsJson: shaped.varsJson,
      buttonJson: shaped.buttonJson,
      rawJson: shaped.rawJson,
      syncedAt: new Date(),
    };
    if (existing) {
      await prisma.waTemplate.update({ where: { name: shaped.name }, data });
      updated++;
    } else {
      await prisma.waTemplate.create({ data: { name: shaped.name, ...data } });
      created++;
    }
  }

  const approved = all.filter((t) => t.status === 'APPROVED').length;
  return {
    total: all.length,
    approved,
    created,
    updated,
    names: all.map((t) => `${t.name} [${t.status}]`),
  };
}
