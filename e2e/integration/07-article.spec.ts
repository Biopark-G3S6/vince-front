import { expect, test } from '@playwright/test';

import { ApiSession, buildScenario, PASSWORD, type Scenario } from './support/api';
import { login, shot } from './support/ui';

/** Tela de Artigo: RF-ART-001 a RF-ART-004 (situação, avaliação, notas e publicação). */
let scenario: Scenario;
const articleTitle = 'Telemedicina em cidades pequenas';

test.beforeAll(async () => {
  scenario = await buildScenario();
  const [bruna, caio] = scenario.students;
  const professor = await ApiSession.login(scenario.professor.email, PASSWORD);
  const event = await professor.post<{ id: string }>('/events', {
    scopeType: 'COHORT',
    scopeId: scenario.cohort.id,
    title: `Seminário ${scenario.suffix}`,
    theme: 'Saúde',
    researchProblem: 'Acesso remoto',
    objectives: 'Artigo',
    maxTeams: 2,
    maxTeamSize: 3,
  });
  await professor.post(`/events/${event.id}/advisors/${scenario.professor.id}`);
  await professor.post(`/events/${event.id}/milestones`, {
    name: 'Projeto',
    order: 1,
    dueAt: '2030-03-01T23:59:00.000Z',
  });
  const team = await professor.post<{ id: string }>(`/events/${event.id}/teams`, {
    identification: 'Equipe Saúde',
    articleTitle,
  });
  for (const student of [bruna!, caio!]) {
    const session = await ApiSession.login(student.email, PASSWORD);
    await session.post(`/teams/${team.id}/membership`);
  }
  const coordinator = await ApiSession.login(scenario.coordinator.email, PASSWORD);
  await coordinator.post(`/teams/${team.id}/advisor/${scenario.professor.id}`);
});

test('ART-001: o aluno acompanha a situação e renomeia o artigo', async ({ page }) => {
  await login(page, scenario.students[0]!.email, PASSWORD);
  await page.goto('/admin/artigos');
  await expect(page.getByRole('heading', { name: articleTitle }).first()).toBeVisible();
  await expect(page.getByText('Equipe Saúde').first()).toBeVisible();
  await expect(page.locator('li[aria-current="step"]')).toHaveText('Iniciado');
  await expect(page.getByText(`Orientador responsável: ${scenario.professor.name}`)).toBeVisible();
  await expect(page.getByText('Avaliação do orientador')).toHaveCount(0);

  await page.getByLabel('Título do artigo').fill(`${articleTitle} no Paraná`);
  await page.getByRole('button', { name: 'Salvar título' }).click();
  await expect(page.getByText('Título atualizado.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `${articleTitle} no Paraná` }).first(),
  ).toBeVisible();
  await shot(page, 'art-01-aluno');
});

test('ART-002/003/004: o orientador responsável avalia, dá notas e registra publicação', async ({
  page,
}) => {
  const [bruna, caio] = scenario.students;
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/artigos');
  await expect(
    page.getByRole('heading', { name: `${articleTitle} no Paraná` }).first(),
  ).toBeVisible();

  await page.getByLabel('Nota do artigo').fill('9.1');
  await page.getByLabel('Parecer do orientador responsável').fill('Boa fundamentação teórica.');
  await page.getByRole('button', { name: 'Registrar avaliação' }).click();
  await expect(page.getByText('Avaliação registrada.')).toBeVisible();

  await page.getByLabel(`Nota de ${bruna!.name}`).fill('9');
  await page.getByLabel(`Nota de ${caio!.name}`).fill('8.5');
  await page.getByRole('button', { name: 'Salvar notas individuais' }).click();
  await expect(page.getByText('Notas individuais registradas.')).toBeVisible();

  await page.getByLabel('Veículo').fill('Anais do Congresso Interno');
  await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('CONFERENCE');
  await page.getByLabel('Data', { exact: true }).fill('2026-10-21');
  await page.getByLabel('URL', { exact: true }).fill('https://example.org/artigo-e2e');
  await page.getByRole('button', { name: 'Salvar publicação' }).click();
  await expect(page.getByText('Publicação registrada.')).toBeVisible();

  // Tudo persistido no servidor.
  await page.reload();
  await expect(page.getByLabel('Nota do artigo')).toHaveValue('9.1');
  await expect(page.getByLabel('Parecer do orientador responsável')).toHaveValue(
    'Boa fundamentação teórica.',
  );
  await expect(page.getByLabel(`Nota de ${bruna!.name}`)).toHaveValue('9');
  await expect(page.getByLabel(`Nota de ${caio!.name}`)).toHaveValue('8.5');
  await expect(page.getByText('Anais do Congresso Interno')).toBeVisible();
  await expect(page.getByText(/Evento científico · 21 de out\. de 2026/)).toBeVisible();
  // Histórico com autor e instante (RF-ART-002 RN3, RF-ART-003 RN3).
  await expect(
    page.getByText(
      new RegExp(`9,1 em .*, por ${scenario.professor.name} — "Boa fundamentação teórica."`),
    ),
  ).toBeVisible();
  await expect(page.getByText('Histórico das notas individuais')).toBeVisible();
  await expect(
    page.getByText(new RegExp(`${caio!.name}: 8,5 em .*, por ${scenario.professor.name}`)),
  ).toBeVisible();
  await shot(page, 'art-02-avaliacao');

  // Alteração do registro (RF-ART-004: consulta, altera ou remove).
  await page.getByRole('button', { name: 'Editar publicação Anais do Congresso Interno' }).click();
  const editing = page.locator('li').filter({
    has: page.getByRole('button', { name: 'Salvar alterações' }),
  });
  await editing.getByLabel('Veículo').fill('Anais revisados');
  await editing.getByLabel('Data', { exact: true }).fill('2026-11-02');
  await editing.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Publicação atualizada.')).toBeVisible();
  await expect(page.getByText(/Evento científico · 2 de nov\. de 2026/)).toBeVisible();

  // A remoção pede confirmação.
  await page.getByRole('button', { name: 'Remover publicação Anais revisados' }).click();
  const confirm = page.getByRole('dialog', { name: 'Remover publicação?' });
  await confirm.getByRole('button', { name: 'Remover publicação' }).click();
  await expect(page.getByText('Publicação removida.')).toBeVisible();
  await expect(page.getByText('Nenhuma publicação registrada.')).toBeVisible();
});

test('ART-001: o coordenador acompanha sem avaliar', async ({ page }) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/artigos');
  await expect(
    page.getByRole('heading', { name: `${articleTitle} no Paraná` }).first(),
  ).toBeVisible();
  await expect(page.getByText('Avaliação do orientador')).toHaveCount(0);
  // O coordenador consulta as publicações do artigo do curso (publication-actors).
  await expect(page.getByText('Publicação externa')).toBeVisible();
  await expect(page.getByText('Nenhuma publicação registrada.')).toBeVisible();

  // Filtros da lista (RF-ART-001).
  await page.getByRole('combobox', { name: 'Situação' }).selectOption('FINISHED');
  await expect(page.getByText('Nenhum artigo')).toBeVisible();
  await page.getByRole('combobox', { name: 'Situação' }).selectOption('');
  await expect(
    page.getByRole('heading', { name: `${articleTitle} no Paraná` }).first(),
  ).toBeVisible();
});

test('ART-001: o nome da equipe vem no artigo, sem uma consulta por evento', async ({ page }) => {
  const teamListings: string[] = [];
  page.on('request', (request) => {
    if (/\/events\/[^/]+\/teams$/.test(new URL(request.url()).pathname)) {
      teamListings.push(request.url());
    }
  });
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/artigos');
  await expect(
    page.getByRole('heading', { name: `${articleTitle} no Paraná` }).first(),
  ).toBeVisible();
  await expect(page.getByText('Equipe Saúde').first()).toBeVisible();
  expect(teamListings).toEqual([]);
});

test('ART-001: professor sem vínculo com o evento não vê o artigo', async ({ page }) => {
  await login(page, scenario.otherProfessor.email, PASSWORD);
  await page.goto('/admin/artigos');
  await expect(page.getByText('Nenhum artigo')).toBeVisible();
});
