import env from '../config/env.js';
import { brDigits } from '../utils/helpers.js';

// ============================================================
//  Serviço WhatsApp — arquitetura preparada para a API Oficial
//  (Meta WhatsApp Cloud API). Em modo "simulado" registra e
//  devolve um id fake. Trocar WHATSAPP_PROVIDER=meta_cloud e
//  preencher token/phone ativa envios reais — SEM mudar o
//  restante do código.
// ============================================================

export async function sendWhatsApp({ to, body, template }) {
  const to164 = to ? '55' + brDigits(to) : to; // E.164 BR (idempotente)
  if (env.whatsapp.provider === 'meta_cloud' && env.whatsapp.token) {
    const url = `https://graph.facebook.com/v20.0/${env.whatsapp.phoneNumberId}/messages`;
    const payload = template
      ? { messaging_product: 'whatsapp', to: to164, type: 'template', template }
      : { messaging_product: 'whatsapp', to: to164, type: 'text', text: { body } };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsapp.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    return { provider: 'meta_cloud', id: data?.messages?.[0]?.id, raw: data };
  }

  const id = `wamid.SIMULATED.${Date.now()}`;
  console.log(`[whatsapp:simulado] -> ${to}: ${body || JSON.stringify(template)}`);
  return { provider: 'simulado', id, simulated: true };
}
