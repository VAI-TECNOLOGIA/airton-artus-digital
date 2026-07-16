import prisma from '../config/prisma.js';

// ============================================================
//  Push notifications (FCM via firebase-admin).
//
//  Credencial: FIREBASE_SERVICE_ACCOUNT_B64 — JSON da service account
//  do Firebase em base64 (uma linha, cabe em env var). Sem a var, o
//  serviço roda em modo SIMULADO (loga em vez de enviar) — mesmo
//  padrão do WhatsApp, pra dev não depender do Firebase.
// ============================================================

let messaging = null;
let initTried = false;

async function getMessaging() {
  if (initTried) return messaging;
  initTried = true;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT_B64 ausente — push em modo simulado.');
    return null;
  }
  try {
    const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app');
    const { getMessaging } = await import('firebase-admin/messaging');
    const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    const app = getApps().length ? getApp() : initializeApp({ credential: cert(credentials) });
    messaging = getMessaging(app);
    console.log(`[push] firebase-admin inicializado (projeto ${credentials.project_id}).`);
  } catch (e) {
    console.error('[push] falha ao inicializar firebase-admin:', e.message);
  }
  return messaging;
}

/**
 * Envia push para os dispositivos dos usuários informados.
 * @param {string[]|null} userIds - null/[] = todos os dispositivos registrados
 * @param {{title:string, body:string, data?:Record<string,string>}} payload
 */
export async function sendPushToUsers(userIds, { title, body, data = {} }) {
  const where = userIds?.length ? { userId: { in: userIds } } : {};
  const tokens = await prisma.deviceToken.findMany({ where, select: { token: true } });
  if (!tokens.length) return { sent: 0, failed: 0, simulated: false };

  const fcm = await getMessaging();
  if (!fcm) {
    console.log(`[push:simulado] ${tokens.length} dispositivo(s) -> "${title}: ${body}"`);
    return { sent: tokens.length, failed: 0, simulated: true };
  }

  const res = await fcm.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: { priority: 'high', notification: { color: '#1B1D39' } },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  // Tokens mortos (app desinstalado, token trocado) saem da base na hora.
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
      dead.push(tokens[i].token);
    }
  });
  if (dead.length) await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });

  return { sent: res.successCount, failed: res.failureCount, pruned: dead.length, simulated: false };
}

/** Registra (ou atualiza o dono de) um token de dispositivo. */
export async function registerDeviceToken({ userId, token, platform = 'android' }) {
  return prisma.deviceToken.upsert({
    where: { token },
    create: { token, platform, userId },
    update: { userId, platform },
  });
}

/** Remove um token (logout / opt-out de notificações no app). */
export async function unregisterDeviceToken(token) {
  await prisma.deviceToken.deleteMany({ where: { token } });
}
