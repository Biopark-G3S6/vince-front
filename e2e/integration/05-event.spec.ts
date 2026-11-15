import { expect, test } from '@playwright/test';

import { buildScenario, PASSWORD, type Scenario } from './support/api';
import { login, shot } from './support/ui';

/** Tela de Evento: RF-EVT-001 a RF-EVT-004. */
let scenario: Scenario;

test.beforeAll(async () => {
  scenario = await buildScenario();
});

test('EVT-001/002/003: professor cria evento da turma, monta o cronograma e designa orientador', async ({
  page,
}) => {
  const title = `Congresso ${scenario.suffix}`;
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/eventos');

  // Escopo superior ao vínculo do professor é recusado (RF-EVT-001 E1).
  await page.getByRole('button', { name: 'Novo evento' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo evento' });
  await dialog.getByRole('combobox', { name: 'Escopo' }).selectOption('COURSE');
  await dialog
    .getByRole('combobox', { name: 'Curso' })
    .selectOption({ label: scenario.course.name });
  await dialog.getByLabel('Título do evento').fill(`${title} curso`);
  await dialog.getByLabel('Tema').fill('Cidades inteligentes');
  await dialog.getByLabel('Problema de pesquisa').fill('Como medir mobilidade urbana?');
  await dialog.getByLabel('Objetivos').fill('Produzir artigo publicável');
  await dialog.getByRole('button', { name: 'Criar evento' }).click();
  await expect(page.getByText('Seu vínculo não permite criar evento neste escopo.')).toBeVisible();

  await dialog.getByRole('combobox', { name: 'Escopo' }).selectOption('COHORT');
  await dialog
    .getByRole('combobox', { name: 'Turma' })
    .selectOption({ label: `${scenario.cohort.identification} (2026/2)` });
  await dialog.getByLabel('Título do evento').fill(title);
  await dialog.getByLabel('Máximo de equipes').fill('3');
  await dialog.getByLabel('Integrantes por equipe').fill('2');
  await dialog.getByRole('button', { name: 'Criar evento' }).click();
  await expect(page.getByText('Evento criado.')).toBeVisible();

  const card = page.locator('article', { hasText: title });
  await expect(card).toContainText(`Turma · ${scenario.cohort.identification}`);
  await expect(card).toContainText('Até 3 equipes · até 2 integrantes por equipe');

  // Edição.
  await page.getByRole('button', { name: 'Editar evento' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar evento' });
  await edit.getByLabel('Tema').fill('Cidades inteligentes e dados abertos');
  await edit.getByRole('button', { name: 'Salvar evento' }).click();
  await expect(page.getByText('Evento atualizado.')).toBeVisible();
  await expect(card).toContainText('Cidades inteligentes e dados abertos');

  // Cronograma: prazos crescentes (RF-EVT-002).
  await page.getByLabel('Nova etapa').fill('Projeto de pesquisa');
  await page.getByLabel('Prazo da etapa').fill('2030-03-10');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText('Etapa adicionada ao cronograma.')).toBeVisible();
  await page.getByLabel('Nova etapa').fill('Entrega final');
  await page.getByLabel('Prazo da etapa').fill('2030-02-01');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(
    page.getByText('Os prazos das etapas precisam ser crescentes, na ordem do cronograma.'),
  ).toBeVisible();
  await page.getByLabel('Prazo da etapa').fill('2030-06-30');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText('2. Entrega final')).toBeVisible();
  await page.getByLabel('Nova etapa').fill('Rascunho descartável');
  await page.getByLabel('Prazo da etapa').fill('2030-08-30');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.getByText('3. Rascunho descartável')).toBeVisible();
  await page.getByRole('button', { name: 'Remover etapa Rascunho descartável' }).click();
  await expect(page.getByText('Etapa removida.')).toBeVisible();
  await expect(page.getByText('3. Rascunho descartável')).toHaveCount(0);

  // Orientadores (RF-EVT-003): o professor de fora da turma não é elegível.
  const advisor = page.getByRole('combobox', { name: 'Professor orientador' });
  await advisor.selectOption({ label: scenario.otherProfessor.name });
  await page.getByRole('button', { name: 'Designar orientador' }).click();
  await expect(
    page.getByText('O professor não é elegível neste evento: está fora do escopo.'),
  ).toBeVisible();
  await advisor.selectOption({ label: scenario.professor.name });
  await page.getByRole('button', { name: 'Designar orientador' }).click();
  await expect(page.getByText('Orientador designado.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Revogar orientador ${scenario.professor.name}` }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('1. Projeto de pesquisa')).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Revogar orientador ${scenario.professor.name}` }),
  ).toBeVisible();
  await shot(page, 'evt-01-evento');
});

test('EVT-004: aluno da turma consulta o evento e o cronograma', async ({ page }) => {
  await login(page, scenario.students[0]!.email, PASSWORD);
  await page.goto('/admin/eventos');
  const card = page.locator('article', { hasText: `Congresso ${scenario.suffix}` });
  await expect(card).toBeVisible();
  await expect(page.getByText('1. Projeto de pesquisa')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo evento' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar evento' })).toHaveCount(0);
  await shot(page, 'evt-02-aluno');
});

test('EVT-001: o dono cancela o evento', async ({ page }) => {
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/eventos');
  await page.getByRole('button', { name: 'Cancelar evento' }).click();
  await expect(page.getByText('Evento cancelado.')).toBeVisible();
  await expect(page.locator('article', { hasText: `Congresso ${scenario.suffix}` })).toContainText(
    'Cancelado',
  );
});
