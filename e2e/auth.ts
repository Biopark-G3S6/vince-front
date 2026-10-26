import { expect, type Page } from '@playwright/test';

export type DemoRole = 'Aluno' | 'Orientador' | 'Coordenador' | 'Administrador';

const accounts: Record<DemoRole, { email: string; userId: string }> = {
  Administrador: { email: 'admin@vinceart.edu.br', userId: 'user-admin' },
  Aluno: { email: 'aluno@vinceart.edu.br', userId: 'user-joao' },
  Coordenador: { email: 'coordenador@vinceart.edu.br', userId: 'user-ricardo' },
  Orientador: { email: 'professor@vinceart.edu.br', userId: 'user-almeida' },
};

export async function loginAs(page: Page, role: DemoRole, returnToCurrentPage = true) {
  const current = new URL(page.url());
  const returnTo = `${current.pathname}${current.search}`;
  const account = accounts[role];

  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill('vince123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  if (returnToCurrentPage && returnTo !== '/entrar' && returnTo !== '/admin/dashboard') {
    await page.goto(returnTo);
  }
}

/** Prepara uma sessão para testes de matriz; os fluxos de login usam loginAs. */
export async function setSession(page: Page, role: DemoRole) {
  const account = accounts[role];
  if (page.url() === 'about:blank') await page.goto('/');

  await page.evaluate((userId) => {
    window.sessionStorage.setItem(
      'vinceart.session',
      JSON.stringify({ state: { userId }, version: 0 }),
    );
  }, account.userId);
}

export function sessionRoleForPath(path: string): DemoRole {
  if (path.includes('/pessoas')) return 'Coordenador';
  if (path.includes('/equipes')) return 'Orientador';
  if (
    path.includes('/editor') ||
    path.includes('/visualizar') ||
    path.includes('/correcao') ||
    path.includes('/discussao') ||
    path.includes('/assistencia')
  ) {
    return 'Aluno';
  }
  return 'Administrador';
}
