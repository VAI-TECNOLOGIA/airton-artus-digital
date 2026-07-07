// E-mail transacional. Provider 'resend' (API HTTP, sem SDK) ou 'simulado' (log).
// Ativa automaticamente quando RESEND_API_KEY existir; EMAIL_PROVIDER força modo.

const FROM_FALLBACK = 'Campanha DEMO <onboarding@resend.dev>';

export function emailProvider() {
  return process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'simulado');
}

export async function sendEmail({ to, subject, html }) {
  const provider = emailProvider();

  if (provider === 'resend') {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || FROM_FALLBACK,
        to: [to],
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`resend ${resp.status}: ${body.slice(0, 200)}`);
    }
    const data = await resp.json();
    return data.id;
  }

  console.log(`[email:simulado] to=${to} subject="${subject}"`);
  return `simulated.${Date.now()}`;
}

/** Template do e-mail de redefinição de senha (identidade da campanha). */
export function resetPasswordEmail({ name, resetUrl }) {
  return {
    subject: 'Redefinição de senha — Campanha DEMO',
    html: `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2733">
  <div style="background:#C8102E;padding:18px 24px;border-radius:10px 10px 0 0">
    <span style="color:#fff;font-size:17px;font-weight:bold">Campanha DEMO</span>
  </div>
  <div style="border:1px solid #e6e9ef;border-top:none;border-radius:0 0 10px 10px;padding:26px 24px">
    <p style="margin:0 0 12px">Olá${name ? `, <strong>${name}</strong>` : ''}!</p>
    <p style="margin:0 0 18px">Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo para criar uma nova (o link vale por <strong>1 hora</strong>):</p>
    <p style="text-align:center;margin:26px 0">
      <a href="${resetUrl}" style="background:#C8102E;color:#fff;text-decoration:none;font-weight:bold;padding:13px 30px;border-radius:9px;display:inline-block">Redefinir minha senha</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7686">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
    <p style="margin:0 0 18px;font-size:12px;word-break:break-all;color:#6b7686">${resetUrl}</p>
    <p style="margin:0;font-size:13px;color:#6b7686">Se você não pediu a redefinição, ignore este e-mail — sua senha continua a mesma.</p>
  </div>
</div>`,
  };
}
