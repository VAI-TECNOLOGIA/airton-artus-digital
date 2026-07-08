import { test as setup, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://airton.vai-sistema.com';
const EMAIL = process.env.E2E_EMAIL || 'admin@airtonartus.com.br';
const PASS = process.env.E2E_PASS || 'Admin@123';

// Passa o gate VAI e autentica no sistema, salvando o storageState para os specs.
setup('autenticar', async ({ page, request }) => {
  const res = await request.post(`${BASE}/api/auth/login`, { data: { email: EMAIL, password: PASS } });
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  expect(token).toBeTruthy();

  await page.goto(`${BASE}/login`);
  await page.evaluate((t) => {
    localStorage.setItem('aad_token', t); // token do sistema
  }, token);

  await page.context().storageState({ path: 'tests/e2e/.auth/state.json' });
});
