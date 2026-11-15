import { expect, test } from '@playwright/test';

import { ApiSession, buildScenario, PASSWORD, type Scenario } from './support/api';
import { login, shot } from './support/ui';

/** Tela de Curso: RF-CUR-001 (manter) e RF-CUR-002 (designar coordenador). */
let scenario: Scenario;

test.beforeAll(async () => {
  scenario = await buildScenario();
});

test('CUR-001/002: cria, edita, designa e revoga coordenador e desativa', async ({ page }) => {
  const code = `ENG${scenario.suffix}`.toUpperCase().slice(0, 20);
  await login(page, scenario.institutionAdmin.email, PASSWORD);
  await page.goto('/admin/cursos');

  // O curso do cenário já aparece, com o coordenador resolvido pelo diretório.
  await expect(page.locator('article', { hasText: scenario.course.name })).toContainText(
    scenario.coordinator.name,
  );

  await page.getByRole('button', { name: 'Novo curso' }).click();
  const create = page.getByRole('dialog', { name: 'Novo curso' });
  await create.getByLabel('Nome do curso').fill(`Engenharia ${scenario.suffix}`);
  await create.getByLabel('Código').fill(code);
  await create.getByRole('button', { name: 'Criar curso' }).click();
  await expect(page.getByText('Curso cadastrado.')).toBeVisible();

  // Edição.
  await page.getByPlaceholder('Buscar por curso, código ou coordenador...').fill(code);
  await page.getByRole('button', { name: `Selecionar Engenharia ${scenario.suffix}` }).click();
  await page.getByRole('button', { name: 'Editar curso' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar curso' });
  await edit.getByLabel('Nome do curso').fill(`Engenharia de Software ${scenario.suffix}`);
  await edit.getByRole('button', { name: 'Salvar curso' }).click();
  await expect(page.getByText('Curso atualizado.')).toBeVisible();
  const row = page.locator('article', { hasText: `Engenharia de Software ${scenario.suffix}` });
  await expect(row).toBeVisible();

  // Designação do coordenador (RF-CUR-002).
  await page.getByLabel('Coordenador ativo').selectOption({ label: scenario.otherProfessor.name });
  await page.getByRole('button', { name: 'Salvar designação' }).click();
  await expect(page.getByText('Coordenação atualizada.')).toBeVisible();
  await expect(row).toContainText(scenario.otherProfessor.name);
  await page.reload();
  await page.getByPlaceholder('Buscar por curso, código ou coordenador...').fill(code);
  await expect(row).toContainText(scenario.otherProfessor.name);
  await shot(page, 'cur-01-coordenador');

  // O designado passa a ter o papel de coordenador.
  const otavio = await ApiSession.login(scenario.otherProfessor.email, PASSWORD);
  expect((await otavio.get<{ roles: string[] }>('/identity')).roles).toContain('COORDINATOR');

  await page.getByRole('button', { name: 'Revogar coordenação' }).click();
  await expect(page.getByText('Coordenação revogada.')).toBeVisible();
  await expect(row).toContainText('Coordenador não definido');

  await page.getByRole('button', { name: 'Desativar curso' }).click();
  await expect(page.getByText('Curso desativado.')).toBeVisible();
  await expect(row).toContainText('Inativo');
});

test('CUR: o coordenador vê o curso, mas não cria nem designa', async ({ page }) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/cursos');
  await expect(page.locator('article', { hasText: scenario.course.name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo curso' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Salvar designação' })).toHaveCount(0);
});
