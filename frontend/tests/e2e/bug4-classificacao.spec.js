import { test, expect } from '@playwright/test';

// BUG 4 — clicar numa tag de classificação dispara apenas 1 PUT.
test('Bug4: classificação envia apenas 1 PUT por clique', async ({ page }) => {
  await page.goto('/conversas');
  const items = page.locator('.convo-item');
  await items.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  test.skip((await items.count()) === 0, 'Sem conversas para testar.');
  await items.first().click();

  const chip = page.locator('.tag-chip', { hasText: 'Apoiador' }).first();
  await chip.waitFor();

  let puts = 0;
  page.on('request', (req) => {
    if (req.method() === 'PUT' && /\/conversations\/[\w-]+/.test(req.url())) puts++;
  });

  await chip.click();
  await page.waitForTimeout(2000); // janela para capturar duplicatas

  expect(puts).toBe(1);
});
