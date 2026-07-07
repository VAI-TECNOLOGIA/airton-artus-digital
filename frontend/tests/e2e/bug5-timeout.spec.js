import { test, expect } from '@playwright/test';

// BUG 5 — falha/lentidão de rede é tratada visualmente (não fica pendente para sempre).
// Simulamos uma rota que falha e validamos que a UI mostra erro em vez de travar.
test('Bug5: erro de rede é tratado (sem pending infinito)', async ({ page }) => {
  await page.route('**/api/dashboard/map', (route) => route.abort('failed'));
  await page.goto('/mapa');
  // a UI sai do loading e mostra o estado de erro com ação de retry
  await expect(page.getByRole('button', { name: /Tentar novamente/i })).toBeVisible({ timeout: 20000 });
});
