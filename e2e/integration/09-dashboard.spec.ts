import { expect, test } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ApiSession,
  buildScenario,
  PASSWORD,
  type Scenario,
} from './support/api';
import { login, shot } from './support/ui';

/** O painel inicial de cada perfil lê a API, e não dados simulados. */
let scenario: Scenario;
let eventTitle: string;
const articleTitle = 'Irrigação inteligente no Oeste do Paraná';

test.beforeAll(async () => {
  scenario = await buildScenario();
  eventTitle = `Feira de Ciências ${scenario.suffix}`;
  const professor = await ApiSession.login(scenario.professor.email, PASSWORD);
  const event = await professor.post<{ id: string }>('/events', {
    scopeType: 'COHORT',
    scopeId: scenario.cohort.id,
    title: eventTitle,
    theme: 'Água no campo',
    researchProblem: 'Como reduzir o desperdício?',
    objectives: 'Artigo',
    maxTeams: 3,
    maxTeamSize: 2,
  });
  await professor.post(`/events/${event.id}/advisors/${scenario.professor.id}`);
  await professor.post(`/events/${event.id}/milestones`, {
    name: 'Projeto',
    order: 1,
    dueAt: '2030-03-01T23:59:00.000Z',
  });
  const team = await professor.post<{ id: string }>(`/events/${event.id}/teams`, {
    identification: 'Equipe Hídrica',
    articleTitle,
  });
  await professor.post(`/teams/${team.id}/members/${scenario.students[0]!.id}`);
  const coordinator = await ApiSession.login(scenario.coordinator.email, PASSWORD);
  await coordinator.post(`/teams/${team.id}/advisor/${scenario.professor.id}`);
});

test('aluno vê o próprio artigo, a equipe, o evento e o orientador', async ({ page }) => {
  await login(page, scenario.students[0]!.email, PASSWORD);
  const work = page.getByRole('region', { name: 'Meu trabalho em andamento' });
  await expect(work.getByRole('heading', { name: articleTitle })).toBeVisible();
  await expect(work.getByText(`Equipe Hídrica · ${eventTitle}`)).toBeVisible();
  await expect(work.getByText(`Orientação: ${scenario.professor.name}`)).toBeVisible();
  await expect(page.getByText('Inscrever-me')).toHaveCount(0);
  await shot(page, 'dash-aluno');
});

test('professor vê as equipes que orienta', async ({ page }) => {
  await login(page, scenario.professor.email, PASSWORD);
  await expect(
    page
      .getByRole('region', { name: 'Trabalhos sob orientação' })
      .getByRole('heading', { name: articleTitle }),
  ).toBeVisible();
});

test('coordenação e administração veem os eventos e a situação dos artigos', async ({ page }) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  const events = page.getByRole('region', { name: 'Eventos em andamento' });
  await expect(events.getByRole('heading', { name: eventTitle })).toBeVisible();
  await expect(events.getByText(`Turma ${scenario.cohort.identification}`)).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Artigos atualizados recentemente' }).getByText(articleTitle),
  ).toBeVisible();
  await shot(page, 'dash-coordenador');

  // A administração institucional não lê turmas: o evento aparece pelo curso.
  await login(page, scenario.institutionAdmin.email, PASSWORD);
  await expect(
    page.getByRole('region', { name: 'Eventos em andamento' }).getByText(scenario.course.name),
  ).toBeVisible();
  await expect(page.getByText('Alpha Team')).toHaveCount(0);

  // Sem ARTICLE:READ nem TEAM:READ (URS §2.3.1): cursos e coordenação, e não artigos.
  const courses = page.getByRole('region', { name: 'Cursos e coordenação' });
  await expect(courses.getByText(scenario.course.name)).toBeVisible();
  await expect(courses.getByText(`Coordenação: ${scenario.coordinator.name}`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Artigos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Equipes', exact: true })).toHaveCount(0);
  await shot(page, 'dash-administracao');
});

test('administrador de sistema vê as instituições', async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(
    page.getByRole('region', { name: 'Instituições' }).getByText(scenario.institution.name),
  ).toBeVisible();
});
