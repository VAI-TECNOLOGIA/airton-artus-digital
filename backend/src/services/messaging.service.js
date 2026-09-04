import env from '../config/env.js';
import { sendWhatsApp } from './whatsapp.service.js';

// ============================================================
//  Roteador de canais — arquitetura unificada para
//  WhatsApp / Instagram Direct / Messenger / SMS / Chat interno.
// ============================================================

export async function sendViaChannel(channel, { to, body, template }) {
  switch (channel) {
    case 'WHATSAPP':
      return sendWhatsApp({ to, body, template });
    case 'SMS':
      console.log(`[sms:${env.sms.provider}] -> ${to}: ${body}`);
      return { provider: env.sms.provider, id: `sms.${Date.now()}`, simulated: true };
    case 'INSTAGRAM':
    case 'MESSENGER':
      console.log(`[meta:${channel}] -> ${to}: ${body}`);
      return { provider: 'meta_graph', id: `${channel.toLowerCase()}.${Date.now()}`, simulated: true };
    case 'CHAT_INTERNO':
    default:
      return { provider: 'interno', id: `chat.${Date.now()}`, simulated: true };
  }
}

/** Substitui variáveis {{nome}}, {{cidade}}, {{bairro}}, {{responsavel}} em um template. */
export function renderTemplate(text, vars = {}) {
  return (text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}
