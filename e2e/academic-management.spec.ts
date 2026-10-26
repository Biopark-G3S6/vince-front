import { expect, test } from '@playwright/test';

import { setSession } from './auth';

test.beforeEach(async ({ page }) => {
  await setSession(page, 'Administrador');
});

test('cadastros: curso e turma permanecem ao navegar e recarregar', async ({ page }) => {
  await page.goto('/admin/cursos');
  await page.getByRole('button', { name: 'Novo curso', exact: true }).click();
  const course = page.getByRole('dialog', { name: 'Novo curso', exact: true });
  await course.getByLabel('Nome do curso').fill('Ciência de Dados E2E');
  await course.getByLabel('Código', { exact: true }).fill('CD-E2E');
  await course.getByRole('button', { name: 'Criar curso', exact: true }).click();
  await expect(course).toBeHidden();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Ciência de Dados E2E', exact: true }).first(),
  ).toBeVisible();

  await page.goto('/admin/turmas');
  await page.getByRole('button', { name: 'Nova turma', exact: true }).click();
  const group = page.getByRole('dialog', { name: 'Nova turma', exact: true });
  await group.getByLabel('Nome da turma').fill('Turma E2E');
  await group
    .getByRole('combobox', { name: /^Curso/ })
    .selectOption({ label: 'Ciência de Dados E2E' });
  await group.getByLabel('Período letivo').fill('2027.1');
  await group.getByLabel('Data inicial').fill('2027-02-01');
  await group.getByLabel('Data final').fill('2027-01-01');
  await group.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page.getByText('A data final deve ser igual ou posterior à data inicial.'),
  ).toBeVisible();
  await group.getByLabel('Data final').fill('2027-06-30');
  await group.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(group).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Turma E2E', exact: true }).first()).toBeVisible();
});

test('artigos: avaliação e publicação permanecem após recarregar', async ({ page }) => {
  await page.goto('/admin/artigos');
  await page.getByLabel('Nota do artigo', { exact: true }).fill('9.1');
  await page
    .getByLabel('Parecer do orientador responsável')
    .fill('Parecer registrado pelo teste de uso.');
  await page.getByRole('button', { name: 'Registrar avaliação', exact: true }).click();
  await expect(page.getByText('Avaliação registrada na demonstração.')).toBeVisible();
  await page.getByLabel('Veículo', { exact: true }).fill('Anais de Ciência E2E');
  await page.getByLabel('URL', { exact: true }).fill('https://example.org/artigo-e2e');
  await page.getByLabel('Data', { exact: true }).fill('21 Out, 2026');
  await page.getByRole('button', { name: 'Salvar publicação', exact: true }).click();
  await expect(page.getByText('Publicação registrada na demonstração.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nota do artigo', { exact: true })).toHaveValue('9.1');
  await expect(page.getByLabel('Parecer do orientador responsável')).toHaveValue(
    'Parecer registrado pelo teste de uso.',
  );
  await expect(page.getByLabel('Veículo', { exact: true })).toHaveValue('Anais de Ciência E2E');
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue(
    'https://example.org/artigo-e2e',
  );
});
