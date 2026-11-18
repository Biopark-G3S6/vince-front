import { expect, type Page } from '@playwright/test';

export const SHOTS_DIR = process.env.E2E_SHOTS_DIR ?? 'test-results/integration-shots';

/** Entra pela tela de login, como o usuário faz (RF-ACS-001). */
export async function login(page: Page, email: string, password: string) {
  // Com sessão ativa, /entrar leva ao painel: trocar de conta começa sem sessão.
  await page.context().clearCookies();
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS_DIR}/${name}.png`, fullPage: true });
}
