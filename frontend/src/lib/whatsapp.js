// Utilitários para envio manual de mensagem por WhatsApp.
// Enquanto a API oficial não está conectada (modo simulado), a equipe copia a
// mensagem ou abre o WhatsApp já preenchido e envia manualmente ao apoiador.

/** Só os dígitos do telefone, com DDI 55 assumido quando vem apenas DDD + número. */
export function phoneDigits(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d && d.length <= 11) d = '55' + d; // DDD + número, sem código do país
  return d;
}

/** Monta um link wa.me com a mensagem pré-preenchida. */
export function waLink(phone, message = '') {
  return `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(message)}`;
}

/** Número formatado para exibição (ex.: +55 (51) 99999-9999). */
export function prettyPhone(phone) {
  const d = phoneDigits(phone);
  if (!d) return '';
  // Remove o DDI 55 para expor o número local (11 dígitos = celular, 10 = fixo).
  let local = d;
  if (local.startsWith('55') && (local.length === 12 || local.length === 13)) local = local.slice(2);
  if (local.length === 11) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return `+${d}`;
}

/** Primeiro nome, para personalizar a saudação. */
function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/**
 * Mensagem padrão de boas-vindas/confirmação, personalizada pelo estado do apoiador.
 * - Voluntário ainda não confirmado → pede confirmação (responder SIM).
 * - Demais casos → agradecimento e próximos passos.
 */
export function defaultMessage(supporter, candidate = 'Airton Artus') {
  const first = firstName(supporter?.name);
  const ola = first ? `Olá, ${first}!` : 'Olá!';
  const isVolunteer = supporter?.supportType === 'VOLUNTARIO';
  const confirmed = supporter?.status === 'CONFIRMADO' || supporter?.volunteer?.confirmed || supporter?.confirmed;
  if (isVolunteer && !confirmed) {
    return `${ola} Aqui é da equipe do ${candidate}. Recebemos seu cadastro como voluntário(a) — que bom ter você com a gente! Para confirmar sua participação, responda *SIM*. Juntos pelo Rio Grande!`;
  }
  return `${ola} Aqui é da equipe do ${candidate}. Muito obrigado pelo seu apoio! Em breve enviaremos as novidades da pré-campanha e como você pode ajudar de perto. Conte com a gente!`;
}
