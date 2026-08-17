import { sendWhatsApp } from './whatsapp.service.js';

// ============================================================
//  Disparos automáticos de templates OFICIAIS do WhatsApp.
//  Toda função é "best-effort": se o envio falhar (template em
//  análise, número de teste, sem telefone), apenas loga — nunca
//  quebra o fluxo principal (criar usuário / esqueci a senha).
// ============================================================

const LANG = 'pt_BR';

/** Boas-vindas / acesso liberado — botão estático para o app (sem variável de botão). */
export async function notifyAccessGranted({ name, phone }) {
  if (!phone) return;
  try {
    await sendWhatsApp({
      to: phone,
      template: {
        name: 'airton_bem_vindo',
        language: { code: LANG },
        components: [{ type: 'body', parameters: [{ type: 'text', text: name || 'tudo bem' }] }],
      },
    });
  } catch (e) {
    console.error('[wa:bem_vindo] falha:', e.message);
  }
}

/** Voluntário confirmado — mensagem de confirmação da participação (template UTILITY). */
export async function notifyVolunteerConfirmed({ name, phone }) {
  if (!phone) return;
  try {
    await sendWhatsApp({
      to: phone,
      template: {
        name: 'airton_voluntario_confirmado',
        language: { code: LANG },
        components: [{ type: 'body', parameters: [{ type: 'text', text: name || 'tudo bem' }] }],
      },
    });
  } catch (e) {
    console.error('[wa:voluntario_confirmado] falha:', e.message);
  }
}

/** Redefinição de senha — botão dinâmico com o token no fim da URL (/redefinir-senha?token={{1}}). */
export async function notifyPasswordReset({ name, phone, token }) {
  if (!phone || !token) return;
  try {
    await sendWhatsApp({
      to: phone,
      template: {
        name: 'airton_redefinir_senha',
        language: { code: LANG },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: name || 'tudo bem' }] },
          { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: token }] },
        ],
      },
    });
  } catch (e) {
    console.error('[wa:redefinir_senha] falha:', e.message);
  }
}
