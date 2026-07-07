import { test, expect } from '@playwright/test';

// BUG 3 — /mapa carrega camadas com dados reais (não fica em 0).
test('Bug3: camadas do mapa carregam com números reais', async ({ page }) => {
  await page.goto('/mapa');

  // espera o fim do loading (o mapa aparece)
  await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 25000 });

  // a contagem de Apoiadores deve ser um número > 0 (não "…" nem 0)
  const label = page.locator('.legend-item', { hasText: 'Apoiadores' }).first();
  await expect(label).toBeVisible();
  const txt = await label.innerText();
  const m = txt.match(/\((\d+)\)/);
  expect(m, `contagem deveria ser numérica: "${txt}"`).not.toBeNull();
  expect(Number(m[1])).toBeGreaterThan(0);

  // há marcadores plotados
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 10000 });
});

test('Bug3: erro de camada é tratado (estado de erro com "Tentar novamente")', async ({ page }) => {
  await page.route('**/api/dashboard/map', (route) => route.abort());
  await page.goto('/mapa');
  // estado de erro explícito (texto pode variar conforme a falha) + ação de retry
  await expect(page.getByRole('button', { name: /Tentar novamente/i })).toBeVisible({ timeout: 20000 });
});
