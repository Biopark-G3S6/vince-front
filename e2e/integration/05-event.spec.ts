import { expect, test } from '@playwright/test';

import { ApiSession, buildScenario, PASSWORD, type Scenario } from './support/api';
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

  // O professor só cria evento da sua turma: escopo superior nem é oferecido (RF-EVT-001 E1).
  await page.getByRole('button', { name: 'Novo evento' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo evento' });
  await expect(dialog.getByRole('combobox', { name: 'Escopo' }).locator('option')).toHaveText([
    'Turma',
  ]);
  await dialog.getByLabel('Tema').fill('Cidades inteligentes');
  await dialog.getByLabel('Problema de pesquisa').fill('Como medir mobilidade urbana?');
  await dialog.getByLabel('Objetivos').fill('Produzir artigo publicável');
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

  // Alteração de etapa (RF-EVT-002: altera ou remove).
  await page.getByRole('button', { name: 'Editar etapa Entrega final' }).click();
  await page.getByLabel('Nome da etapa').fill('Versão final');
  await page.getByLabel('Novo prazo').fill('2030-07-15');
  await page.getByRole('button', { name: 'Salvar etapa' }).click();
  await expect(page.getByText('Etapa atualizada.')).toBeVisible();
  await expect(page.getByText('2. Versão final')).toBeVisible();
  await expect(page.getByText(/15 de jul\. de 2030/)).toBeVisible();

  // Orientadores (RF-EVT-003): o professor de fora da turma não é elegível.
  const advisor = page.getByRole('combobox', { name: 'Professor orientador' });
  await advisor.selectOption({
    label: `${scenario.otherProfessor.name} (${scenario.otherProfessor.email})`,
  });
  await page.getByRole('button', { name: 'Designar orientador' }).click();
  await expect(
    page.getByText('O professor não é elegível neste evento: está fora do escopo.'),
  ).toBeVisible();
  await advisor.selectOption({
    label: `${scenario.professor.name} (${scenario.professor.email})`,
  });
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
  const confirm = page.getByRole('dialog', { name: 'Cancelar evento?' });
  await confirm.getByRole('button', { name: 'Cancelar evento' }).click();
  await expect(page.getByText('Evento cancelado.')).toBeVisible();
  await expect(page.locator('article', { hasText: `Congresso ${scenario.suffix}` })).toContainText(
    'Cancelado',
  );
});

test('EVT-001/004: escopos por papel, lista por escopo e orientador sem gestão', async ({
  page,
}) => {
  const scopes = async () => {
    await page.goto('/admin/eventos');
    await page.getByRole('button', { name: 'Novo evento' }).click();
    const options = page
      .getByRole('dialog', { name: 'Novo evento' })
      .getByRole('combobox', { name: 'Escopo' })
      .locator('option');
    const labels = await options.allTextContents();
    await page.keyboard.press('Escape');
    return labels;
  };
  await login(page, scenario.coordinator.email, PASSWORD);
  expect(await scopes()).toEqual(['Turma', 'Curso']);
  await login(page, scenario.institutionAdmin.email, PASSWORD);
  expect(await scopes()).toEqual(['Curso', 'Instituição']);

  // O coordenador cria um evento de curso e designa a professora como orientadora.
  const coordinator = await ApiSession.login(scenario.coordinator.email, PASSWORD);
  const event = await coordinator.post<{ id: string; title: string }>('/events', {
    scopeType: 'COURSE',
    scopeId: scenario.course.id,
    title: `Semana do curso ${scenario.suffix}`,
    theme: 'Tema',
    researchProblem: 'Problema',
    objectives: 'Objetivos',
    maxTeams: 5,
    maxTeamSize: 3,
  });
  await coordinator.post(`/events/${event.id}/advisors/${scenario.professor.id}`);

  // A orientadora vê o evento, agrupado por escopo, mas sem os controles de dono.
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/eventos');
  const byCourse = page.getByRole('region', { name: 'Eventos de Curso' });
  const card = byCourse.locator('article', { hasText: event.title });
  await card.getByRole('button', { name: `Abrir ${event.title}` }).click();
  await expect(page.getByRole('link', { name: 'Ver equipes do evento' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar evento' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cancelar evento' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Designar orientador' })).toHaveCount(0);
  await expect(page.getByLabel('Nova etapa')).toHaveCount(0);
  await shot(page, 'evt-03-orientadora');
});
