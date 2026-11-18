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

  // A Equipe Alfa já tem dois integrantes: lotada, sem a opção de ingressar.
  const alfa = page.locator('article', { hasText: 'Equipe Alfa' });
  await expect(alfa).toContainText('2/2 integrantes · sem vagas');
  await expect(alfa.getByRole('button', { name: 'Ingressar' })).toHaveCount(0);

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

test('EQP: evento pelo endereço, vagas, ingresso só com vaga e convite de outro evento', async ({
  page,
}) => {
  const owner = await ApiSession.login(scenario.professor.email, PASSWORD);
  const other = await owner.post<{ id: string; title: string }>('/events', {
    scopeType: 'COHORT',
    scopeId: scenario.cohort.id,
    title: `Feira ${scenario.suffix}`,
    theme: 'Tema',
    researchProblem: 'Problema',
    objectives: 'Objetivos',
    maxTeams: 2,
    maxTeamSize: 1,
  });

  // A dona do evento ainda não orienta: não cria equipe.
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto(`/admin/equipes?evento=${other.id}`);
  await expect(page.getByRole('combobox', { name: 'Evento' })).toHaveValue(other.id);
  await expect(page.getByRole('button', { name: 'Criar equipe' })).toHaveCount(0);

  await owner.post(`/events/${other.id}/advisors/${scenario.professor.id}`);
  const solo = await owner.post<{ id: string }>(`/events/${other.id}/teams`, {
    identification: 'Equipe Solo',
  });
  await owner.post(`/events/${other.id}/teams`, { identification: 'Equipe Dupla' });
  const [first, second] = scenario.students;
  await owner.post(`/teams/${solo.id}/members/${first!.id}`);
  await owner.post(`/teams/${solo.id}/invitations`, {
    userId: second!.id,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });

  // O aluno vê as vagas e só pode ingressar onde há vaga.
  await login(page, second!.email, PASSWORD);
  await page.goto(`/admin/equipes?evento=${other.id}`);
  const soloCard = page.locator('article', { hasText: 'Equipe Solo' });
  const duplaCard = page.locator('article', { hasText: 'Equipe Dupla' });
  await expect(soloCard).toContainText('1/1 integrantes · sem vagas');
  await expect(duplaCard).toContainText('0/1 integrantes · 1 vaga');
  await expect(soloCard.getByRole('button', { name: 'Ingressar' })).toHaveCount(0);

  // O convite recebido diz a equipe e o evento.
  await expect(
    page.getByText(`Convite para a equipe Equipe Solo do evento ${other.title}`),
  ).toBeVisible();

  await duplaCard.getByRole('button', { name: 'Ingressar' }).click();
  await expect(page.getByText('Você entrou na equipe.')).toBeVisible();
  await expect(duplaCard).toContainText('1/1 integrantes · sem vagas');
  // Já tem equipe no evento: nenhum "Ingressar".
  await expect(page.getByRole('button', { name: 'Ingressar' })).toHaveCount(0);
  await shot(page, 'eqp-05-vagas');
});
