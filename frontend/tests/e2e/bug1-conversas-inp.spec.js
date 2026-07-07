import { test, expect } from '@playwright/test';

// BUG 1 — envio otimista no /conversas (mensagem aparece imediatamente, sem travar).
test('Bug1: mensagem aparece imediatamente com status enviando', async ({ page }) => {
  await page.goto('/conversas');
  const items = page.locator('.convo-item');
  await items.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  test.skip((await items.count()) === 0, 'Sem conversas de WhatsApp para testar.');

  await items.first().click();
  const input = page.getByPlaceholder('Digite uma resposta...');
  await input.waitFor();
  const msg = 'Teste e2e ' + Date.now();
  await input.fill(msg);

  const t0 = Date.now();
  await page.locator('.chat-input button.btn-primary').click();

  // a bolha enviada aparece em <1,5s (UI otimista)
  await expect(page.locator('.bubble.out', { hasText: msg })).toBeVisible({ timeout: 1500 });
  expect(Date.now() - t0).toBeLessThan(1500);
});

test('Bug1: "Simular mensagem recebida" não bloqueia a UI', async ({ page }) => {
  await page.goto('/conversas');
  const btn = page.getByRole('button', { name: /Simular mensagem/i });
  await btn.waitFor();
  const t0 = Date.now();
  await btn.click();
  // o clique retorna rápido (sem prompt bloqueante)
  expect(Date.now() - t0).toBeLessThan(1000);
});
