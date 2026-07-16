import { Capacitor } from '@capacitor/core';
import api from '../api/client.js';

// ============================================================
//  Push notifications no app nativo (Capacitor + FCM).
//  No navegador tudo aqui é no-op — só roda dentro do app.
//  Fluxo: login → pede permissão → registra no FCM → manda o
//  token pro backend (POST /push/register), que envia via
//  firebase-admin.
// ============================================================

const TOKEN_KEY = 'aad_push_token';
let listenersBound = false;

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/** Chame após o login (ou na reidratação da sessão). Idempotente. */
export async function initPushNotifications() {
  if (!isNativeApp()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    if (!listenersBound) {
      listenersBound = true;

      PushNotifications.addListener('registration', async ({ value: token }) => {
        try {
          const platform = Capacitor.getPlatform(); // 'android' | 'ios'
          await api.post('/push/register', { token, platform });
          localStorage.setItem(TOKEN_KEY, token);
        } catch (e) {
          console.warn('[push] falha ao registrar token no backend:', e?.message);
        }
      });

      PushNotifications.addListener('registrationError', (e) => {
        console.warn('[push] erro de registro FCM:', JSON.stringify(e));
      });

      // Toque na notificação → navega pro destino (avisos abrem o mural).
      PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const kind = notification?.data?.kind;
        if (kind === 'notice') window.location.assign('/mural');
      });
    }

    await PushNotifications.register();
  } catch (e) {
    console.warn('[push] init falhou:', e?.message);
  }
}

/** Chame no logout — o dispositivo para de receber push da conta. */
export async function teardownPushNotifications() {
  if (!isNativeApp()) return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await api.post('/push/unregister', { token });
  } catch (e) {
    // logout não pode falhar por causa disso
  }
  localStorage.removeItem(TOKEN_KEY);
}
