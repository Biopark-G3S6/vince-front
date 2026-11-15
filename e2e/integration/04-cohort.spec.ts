import { expect, test } from '@playwright/test';

import { buildScenario, PASSWORD, type Scenario } from './support/api';
import { login, shot } from './support/ui';

/** Tela de Turma: RF-TUR-001 a RF-TUR-005. */
let scenario: Scenario;

test.beforeAll(async () => {
  scenario = await buildScenario();
});

test('TUR-001/002: coordenador cria turma e designa/revoga professor', async ({ page }) => {
  const name = `Turma Nova ${scenario.suffix}`;
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/turmas');

  await page.getByRole('button', { name: 'Nova turma' }).click();
  const create = page.getByRole('dialog', { name: 'Nova turma' });
  await create.getByLabel('Nome da turma').fill(name);
  await create
    .getByRole('combobox', { name: /^Curso/ })
    .selectOption({ label: scenario.course.name });
  await create.getByLabel('Período letivo').fill('2027.1');
  await create.getByLabel('Data inicial').fill('2027-02-01');
  await create.getByLabel('Data final').fill('2027-01-01');
  await create.getByRole('button', { name: 'Salvar' }).click();
  await expect(
    page.getByText('A data final deve ser igual ou posterior à data inicial.'),
  ).toBeVisible();
  await create.getByLabel('Data final').fill('2027-06-30');
  await create.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Turma criada.')).toBeVisible();

  await page.reload();
  await page.getByPlaceholder('Buscar por turma, curso ou período...').fill(name);
  const card = page.locator('article', { hasText: name });
  await expect(card).toContainText('Planejada');
  await expect(card).toContainText('01/02/2027');

  await page.getByRole('button', { name: 'Designar professor' }).click();
  const assign = page.getByRole('dialog', { name: 'Designar professor' });
  await assign
    .getByRole('combobox', { name: 'Professor' })
    .selectOption({ label: scenario.otherProfessor.name });
  await assign.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Professor designado.')).toBeVisible();
  await expect(page.getByText(scenario.otherProfessor.name)).toBeVisible();
  await shot(page, 'tur-01-professor');

  await page
    .getByRole('button', { name: `Revogar professor ${scenario.otherProfessor.name}` })
    .click();
  await expect(page.getByText('Vínculo do professor revogado.')).toBeVisible();
  await expect(page.getByText('Nenhum professor designado.')).toBeVisible();
});

test('TUR-003/004/005: professor matricula, emite convite e o aluno ingressa', async ({
  page,
  browser,
}) => {
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/turmas');
  await page
    .getByPlaceholder('Buscar por turma, curso ou período...')
    .fill(scenario.cohort.identification);

  // Os alunos que ingressaram por convite no cenário já estão matriculados.
  for (const student of scenario.students) {
    await expect(page.getByText(student.name)).toBeVisible();
  }

  // RF-TUR-003: cadastro direto.
  await page.getByRole('button', { name: 'Cadastrar aluno' }).click();
  const enroll = page.getByRole('dialog', { name: 'Cadastrar aluno' });
  await enroll.getByLabel('Nome do aluno').fill('Eduardo Direto');
  await enroll.getByLabel('E-mail do aluno').fill(`direto.${scenario.suffix}@e2e.test`);
  await enroll.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Aluno cadastrado na turma.')).toBeVisible();
  await expect(page.getByText('Eduardo Direto')).toBeVisible();

  // RF-TUR-004: convite multiuso; o link aparece uma única vez.
  await page.getByRole('button', { name: 'Emitir convite multiuso' }).click();
  const invite = page.getByRole('dialog', { name: 'Emitir convite multiuso' });
  await invite.getByLabel('Validade do convite').fill('2030-12-31');
  await invite.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Convite emitido.')).toBeVisible();
  const linkText = await page.getByText('Link do convite:').textContent();
  const url = linkText?.replace('Link do convite:', '').trim() ?? '';
  expect(url).toContain('/invitations/');
  await shot(page, 'tur-02-convite');

  // RF-TUR-005: o aluno abre o link em outra sessão e cria a conta.
  const visitor = await browser.newContext();
  const guest = await visitor.newPage();
  await guest.goto(url);
  await expect(guest.getByText(/Você foi convidado como Aluno/)).toBeVisible();
  await guest.getByLabel('Nome completo').fill('Fernanda Convidada');
  await guest.getByLabel('E-mail', { exact: true }).fill(`fernanda.${scenario.suffix}@e2e.test`);
  await guest.getByLabel('Nova senha').fill(PASSWORD);
  await guest.getByLabel('Confirmar senha').fill(PASSWORD);
  await guest.getByRole('button', { name: 'Criar conta' }).click();
  await expect(guest.getByRole('status')).toContainText('Conta criada');
  await visitor.close();

  await page.reload();
  await page
    .getByPlaceholder('Buscar por turma, curso ou período...')
    .fill(scenario.cohort.identification);
  await expect(page.getByText('Fernanda Convidada')).toBeVisible();
  const lastInvite = page.getByText(/Usos: 1/).first();
  await expect(lastInvite).toBeVisible();

  // Revogação do convite.
  await page
    .getByRole('button', { name: /^Revogar convite/ })
    .first()
    .click();
  await expect(page.getByText('Convite revogado.')).toBeVisible();
  await expect(page.getByText('Revogado').first()).toBeVisible();
  await expect(page.getByText('Validade: 31/12/2030').first()).toBeVisible();
  await shot(page, 'tur-03-matriculas');
});

test('TUR-001: coordenador encerra a turma', async ({ page }) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/turmas');
  await page
    .getByPlaceholder('Buscar por turma, curso ou período...')
    .fill(scenario.cohort.identification);
  await page.getByRole('button', { name: 'Encerrar turma' }).click();
  await expect(page.getByText('Turma encerrada.')).toBeVisible();
  await expect(page.locator('article', { hasText: scenario.cohort.identification })).toContainText(
    'Encerrada',
  );
});
