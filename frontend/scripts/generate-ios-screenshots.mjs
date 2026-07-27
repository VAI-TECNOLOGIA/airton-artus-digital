// Gera screenshots iPhone 6.7" (1290×2796) reais do app, light + dark, para a
// App Store. Roda o dev server local apontado para a API de PRODUÇÃO, loga com a
// conta de review (MEMBRO) e captura viewport-only (fullPage:false) em DPR=3.
// Depois força a dimensão exata com sips. Ver MOBILE_README 15.11.B.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const EMAIL = 'review@airtonartus.com.br';
const PASSWORD = 'ReviewArtus2026!';

const TARGET_W = 1290;
const TARGET_H = 2796;
const LOGICAL_W = 430;
const LOGICAL_H = 932;

// Rotas visíveis para o perfil MEMBRO (+ landing pública).
const SCREENS = [
  { route: '/lp',          name: '01-landing',    auth: false },
  { route: '/',            name: '02-dashboard',  auth: true  },
  { route: '/relatorios',  name: '03-relatorios', auth: true  },
  { route: '/mapa',        name: '04-mapa',       auth: true  },
  { route: '/midia-kit',   name: '05-midiakit',   auth: true  },
];

const THEMES = ['light', 'dark'];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 20000 });
  await page.waitForLoadState('networkidle');
}

(async () => {
  mkdirSync('app-store-assets/screenshots/raw', { recursive: true });
  mkdirSync('app-store-assets/screenshots/final', { recursive: true });

  const browser = await chromium.launch();

  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: LOGICAL_W, height: LOGICAL_H },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      colorScheme: theme,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();

    // Persiste a preferência de tema do app (além do colorScheme do browser).
    await page.addInitScript((t) => {
      try { localStorage.setItem('theme', t); localStorage.setItem('aad_theme', t); } catch {}
    }, theme);

    await login(page);

    for (const { route, name } of SCREENS) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      // Mapa (tiles Leaflet) e gráficos (Recharts) precisam de mais tempo.
      const wait = /mapa|relatorios/.test(route) ? 3500 : 1400;
      await page.waitForTimeout(wait); // animações / carregamento de dados
      const raw = `app-store-assets/screenshots/raw/${name}-${theme}.png`;
      await page.screenshot({ path: raw, fullPage: false });

      const final = `app-store-assets/screenshots/final/${name}-${theme}.png`;
      execSync(`sips -z ${TARGET_H} ${TARGET_W} "${raw}" --out "${final}"`, { stdio: 'inherit' });
    }

    await ctx.close();
  }

  await browser.close();
  console.log('OK: screenshots em app-store-assets/screenshots/final/');
})();
