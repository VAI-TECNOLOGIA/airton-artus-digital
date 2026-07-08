import { defineConfig } from '@playwright/test';

// Por padrão testa a produção; sobrescreva com PLAYWRIGHT_BASE_URL para apontar
// para o ambiente local (ex.: http://localhost:5173).
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://airton.vai-sistema.com';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    headless: true,
    actionTimeout: 15000,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: 'tests/e2e/.auth/state.json' },
    },
  ],
});
