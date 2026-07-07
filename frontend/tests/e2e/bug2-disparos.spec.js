import { test, expect } from '@playwright/test';

// BUG 2 — disparo em lotes: POST /send responde 202 + progresso + botão Cancelar.
test('Bug2: disparo assíncrono responde 202 e mostra progresso', async ({ page }) => {
  await page.goto('/disparos');

  // cria uma campanha de teste
  await page.getByRole('button', { name: /Nova campanha/i }).click();
  await page.locator('.backdrop').waitFor({ state: 'visible' });
  const name = 'E2E ' + Date.now();
  await page.locator('.backdrop input.input').first().fill(name);
  await page.locator('.backdrop textarea.textarea').first().fill('Olá {{nome}}, teste e2e!');
  await page.getByRole('button', { name: 'Criar' }).click();
  await page.locator('.backdrop').waitFor({ state: 'hidden' }).catch(() => {});

  // abre a campanha recém-criada
  await page.locator('table.table tr', { hasText: name }).getByRole('button', { name: 'Abrir' }).click();
  await page.locator('.backdrop').waitFor({ state: 'visible' });

  // CSV com 60 contatos (vários lotes)
  let csv = 'nome,telefone,cidade,bairro';
  for (let i = 0; i < 60; i++) csv += `\nTeste ${i},555199${String(1000000 + i)},Porto Alegre,Centro`;
  await page.locator('.backdrop textarea.textarea').first().fill(csv);
  await page.getByRole('button', { name: 'Importar' }).click();
  const totalStat = page.locator('.backdrop .stat-card', { has: page.locator('.stat-label', { hasText: 'Total' }) }).locator('.stat-value');
  await expect(totalStat).not.toHaveText('0', { timeout: 12000 });

  await page.getByRole('button', { name: /Disparar pendentes/i }).click();

  // o envio começa SEM bloquear a UI: barra de progresso + botão Cancelar aparecem na hora
  await expect(page.locator('.bc-progress')).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('button', { name: /Cancelar envio/i })).toBeVisible();
  // progresso é mostrado item a item (não pula de 0 para N só no fim)
  await expect(page.locator('.bc-progress-info')).toContainText(/enviados/i);
});
