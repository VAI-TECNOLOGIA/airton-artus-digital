import { test, expect } from '@playwright/test';

// BUG 3 — /mapa carrega camadas com dados reais (não fica em 0).
test('Bug3: camadas do mapa carregam com números reais', async ({ page }) => {
  await page.goto('/mapa');

  // espera o fim do loading (o mapa aparece)
  await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 25000 });

  // a contagem de Apoiadores deve ser um número > 0 (não "…" nem 0)
  const item = page.locator('.layer-item', { hasText: 'Apoiadores' }).first();
  await expect(item).toBeVisible();
  const txt = await item.locator('.layer-count').innerText();
  const n = Number(txt.replace(/\D/g, ''));
  expect(n, `contagem deveria ser numérica > 0: "${txt}"`).toBeGreaterThan(0);

  // há marcadores plotados
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 10000 });
});

test('Bug3: erro de camada é tratado (estado de erro com "Tentar novamente")', async ({ page }) => {
  await page.route('**/api/dashboard/map', (route) => route.abort());
  await page.goto('/mapa');
  // estado de erro explícito (texto pode variar conforme a falha) + ação de retry
  await expect(page.getByRole('button', { name: /Tentar novamente/i })).toBeVisible({ timeout: 20000 });
});
