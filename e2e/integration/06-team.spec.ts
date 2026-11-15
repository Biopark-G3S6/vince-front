import { expect, test } from '@playwright/test';

import { ApiSession, buildScenario, PASSWORD, type Scenario } from './support/api';
import { login, shot } from './support/ui';

/** Tela de Equipe: RF-EQP-001 a RF-EQP-006. */
let scenario: Scenario;
let eventTitle: string;

test.beforeAll(async () => {
  scenario = await buildScenario();
  eventTitle = `Mostra ${scenario.suffix}`;
  const professor = await ApiSession.login(scenario.professor.email, PASSWORD);
  const event = await professor.post<{ id: string }>('/events', {
    scopeType: 'COHORT',
    scopeId: scenario.cohort.id,
    title: eventTitle,
    theme: 'Saúde digital',
    researchProblem: 'Como reduzir filas?',
    objectives: 'Artigo para o congresso interno',
    maxTeams: 3,
    maxTeamSize: 2,
  });
  await professor.post(`/events/${event.id}/advisors/${scenario.professor.id}`);
  await professor.post(`/events/${event.id}/milestones`, {
    name: 'Projeto',
    order: 1,
    dueAt: '2030-03-01T23:59:00.000Z',
  });
  await professor.post(`/events/${event.id}/teams`, { identification: 'Equipe Beta' });
});

test('EQP-001/003/004/006: orientador cria equipe, designa e convida', async ({ page }) => {
  const [bruna, caio] = scenario.students;
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/equipes');
  await expect(page.getByLabel('Evento')).toHaveValue(/.+/);

  // RF-EQP-001: a equipe nasce com o artigo em STARTED e o título informado.
  await page.getByRole('button', { name: 'Criar equipe' }).click();
  const dialog = page.getByRole('dialog', { name: 'Criar equipe' });
  await dialog.getByLabel('Nome da equipe').fill('Equipe Alfa');
  await dialog.getByLabel('Título do artigo').fill('Filas em unidades de saúde');
  await dialog.getByRole('button', { name: 'Criar equipe' }).click();
  await expect(page.getByText('Equipe criada com o seu artigo.')).toBeVisible();
  const card = page.locator('article', { hasText: 'Equipe Alfa' });
  await expect(card).toContainText('Iniciado');
  await expect(card).toContainText('Filas em unidades de saúde');

  // RF-EQP-006: os três alunos da turma são elegíveis e estão sem equipe.
  await page.getByRole('button', { name: 'Gerenciar Equipe Alfa' }).click();
  for (const student of scenario.students) {
    await expect(page.getByRole('button', { name: `Designar ${student.name}` })).toBeVisible();
  }

  // RF-EQP-003 e papel do integrante.
  await page.getByRole('button', { name: `Designar ${bruna!.name}` }).click();
  await expect(page.getByText('Aluno designado à equipe.')).toBeVisible();
  await page.getByLabel(`Papel de ${bruna!.name}`).selectOption('LEADER');
  await expect(page.getByText('Papel atualizado.')).toBeVisible();

  // RF-EQP-004: convite.
  await page.getByRole('button', { name: `Convidar ${caio!.name}` }).click();
  await expect(page.getByText('Convite enviado ao aluno.')).toBeVisible();
  await expect(page.getByText(new RegExp(`${caio!.name} · até`))).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Gerenciar Equipe Alfa' }).click();
  await expect(page.getByText(`${bruna!.name} · Líder`)).toBeVisible();
  // O professor não é dono do escopo para nomear responsável (TEAM:ASSIGN_ADVISOR).
  await expect(page.getByRole('button', { name: 'Designar responsável' })).toHaveCount(0);
  await shot(page, 'eqp-01-equipe');
});

test('EQP-005: o coordenador (dono do escopo) nomeia o orientador responsável', async ({
  page,
}) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/equipes');
  await page.getByRole('button', { name: 'Gerenciar Equipe Alfa' }).click();
  await page
    .getByRole('combobox', { name: 'Orientador responsável' })
    .selectOption({ label: scenario.professor.name });
  await page.getByRole('button', { name: 'Designar responsável' }).click();
  await expect(page.getByText('Orientador responsável designado.')).toBeVisible();
  await expect(page.locator('article', { hasText: 'Equipe Alfa' })).toContainText(
    `Orientador responsável: ${scenario.professor.name}`,
  );
});

test('EQP-004: o aluno convidado aceita o convite', async ({ page }) => {
  const caio = scenario.students[1]!;
  await login(page, caio.email, PASSWORD);
  await page.goto('/admin/equipes');
  await expect(page.getByText('Convites recebidos')).toBeVisible();
  await page.getByRole('button', { name: 'Aceitar' }).click();
  await expect(page.getByText('Você entrou na equipe.')).toBeVisible();
  await expect(page.getByText('Convites recebidos')).toHaveCount(0);
});

test('EQP-002: aluno ingressa por conta própria e respeita o limite', async ({ page }) => {
  const diana = scenario.students[2]!;
  await login(page, diana.email, PASSWORD);
  await page.goto('/admin/equipes');

  // A Equipe Alfa já tem dois integrantes: lotada.
  await page
    .locator('article', { hasText: 'Equipe Alfa' })
    .getByRole('button', { name: 'Ingressar' })
    .click();
  await expect(page.getByText('A equipe atingiu o tamanho máximo.')).toBeVisible();

  await page
    .locator('article', { hasText: 'Equipe Beta' })
    .getByRole('button', { name: 'Ingressar' })
    .click();
  await expect(page.getByText('Você entrou na equipe.')).toBeVisible();
  await expect(
    page.locator('article', { hasText: 'Equipe Beta' }).getByRole('button', { name: 'Ingressar' }),
  ).toHaveCount(0);
  await shot(page, 'eqp-02-aluno');
});

test('EQP-003: o orientador do evento remove integrante', async ({ page }) => {
  const bruna = scenario.students[0]!;
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/equipes');
  await page.getByRole('button', { name: 'Gerenciar Equipe Alfa' }).click();
  await page.getByRole('button', { name: `Remover ${bruna.name}` }).click();
  await expect(page.getByText('Integrante removido.')).toBeVisible();
  await expect(page.getByRole('button', { name: `Designar ${bruna.name}` })).toBeVisible();
});

test('EQP-005: o dono do escopo revoga o responsável', async ({ page }) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/equipes');
  await page.getByRole('button', { name: 'Gerenciar Equipe Alfa' }).click();
  await page.getByRole('button', { name: 'Revogar responsável' }).click();
  await expect(page.getByText('Orientador responsável revogado.')).toBeVisible();
  await expect(page.locator('article', { hasText: 'Equipe Alfa' })).toContainText(
    'Orientador responsável: não definido',
  );
});
