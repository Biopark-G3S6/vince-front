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
  await assign.getByRole('combobox', { name: 'Professor' }).selectOption({
    label: `${scenario.otherProfessor.name} (${scenario.otherProfessor.email})`,
  });
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
  const lastInvite = page.getByText(/^1 ingresso ·/).first();
  await expect(lastInvite).toBeVisible();

  // Revogação do convite.
  await page
    .getByRole('button', { name: /^Revogar convite/ })
    .first()
    .click();
  await expect(page.getByText('Convite revogado.')).toBeVisible();
  await expect(page.getByText('Revogado').first()).toBeVisible();
  await expect(page.getByText(/válido até 31\/12\/2030/).first()).toBeVisible();
  await shot(page, 'tur-03-matriculas');
});

test('TUR-001: coordenador encerra a turma', async ({ page }) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/turmas');
  await page
    .getByPlaceholder('Buscar por turma, curso ou período...')
    .fill(scenario.cohort.identification);
  await page.getByRole('button', { name: 'Encerrar turma' }).click();
  // A ação não tem volta: pede confirmação.
  const confirm = page.getByRole('dialog', { name: 'Encerrar turma?' });
  await confirm.getByRole('button', { name: 'Encerrar turma' }).click();
  await expect(page.getByText('Turma encerrada.')).toBeVisible();
  await expect(page.locator('article', { hasText: scenario.cohort.identification })).toContainText(
    'Encerrada',
  );
});

test('TUR-001: coordenador edita a turma; a lista vem numa só requisição', async ({ page }) => {
  await login(page, scenario.coordinator.email, PASSWORD);
  const listings: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (/\/cohorts$/.test(path) && request.method() === 'GET') listings.push(path);
  });
  await page.goto('/admin/turmas');
  const name = `ED${scenario.suffix}`.toUpperCase().slice(0, 20);
  await page.getByRole('button', { name: 'Nova turma' }).click();
  const create = page.getByRole('dialog', { name: 'Nova turma' });
  await create.getByLabel('Nome da turma').fill(name);
  await create.getByLabel('Período letivo').fill('2027.2');
  await create.getByLabel('Data inicial').fill('2027-08-01');
  await create.getByLabel('Data final').fill('2027-12-10');
  await create.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Turma criada.')).toBeVisible();
  expect(listings).toEqual(['/api/v1/cohorts', '/api/v1/cohorts']);

  await page.getByRole('button', { name: 'Editar turma' }).click();
  const edit = page.getByRole('dialog', { name: 'Editar turma' });
  await expect(edit.getByLabel('Data inicial')).toHaveValue('2027-08-01');
  await edit.getByLabel('Período letivo').fill('2027.3');
  await edit.getByLabel('Data final').fill('2027-12-20');
  await edit.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Turma atualizada.')).toBeVisible();
  const card = page.locator('article', { hasText: name });
  await expect(card).toContainText('2027.3');
  await expect(card).toContainText('20/12/2027');
});

test('Pessoas: coordenador convida professor, que ingressa e é designado', async ({
  page,
  browser,
}) => {
  const email = `novo.professor.${scenario.suffix}@e2e.test`;
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/pessoas');
  await expect(page.getByText(scenario.professor.name)).toBeVisible();
  await page.getByLabel('E-mail do professor').fill(email);
  await page.getByRole('button', { name: 'Convidar professor' }).click();
  await expect(page.getByText('Convite de professor emitido.')).toBeVisible();
  const link = ((await page.getByText(/\/invitations\//).textContent()) ?? '').trim();
  await expect(page.locator('article', { hasText: email })).toContainText('Pendente');
  await shot(page, 'tur-04-pessoas');

  const visitor = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const guest = await visitor.newPage();
  await guest.goto(new URL(link).pathname);
  await expect(guest.getByText(/Você foi convidado como Professor/)).toBeVisible();
  await guest.getByLabel('Nome completo').fill('Vera Convidada');
  await guest.getByLabel('Nova senha').fill(PASSWORD);
  await guest.getByLabel('Confirmar senha').fill(PASSWORD);
  await guest.getByRole('button', { name: 'Criar conta' }).click();
  await expect(guest.getByRole('status')).toContainText('Conta criada');
  await visitor.close();

  await page.reload();
  await expect(
    page.locator('article', { hasText: email }).filter({ hasText: 'válido até' }),
  ).toContainText('Aceito');
  await page.getByPlaceholder('Buscar por nome ou e-mail...').fill('Vera');
  await expect(page.getByRole('heading', { name: 'Vera Convidada' })).toBeVisible();

  // Já com conta, aparece na busca do seletor e é designada à turma.
  await page.goto('/admin/turmas');
  await page.getByRole('button', { name: 'Designar professor' }).click();
  const assign = page.getByRole('dialog', { name: 'Designar professor' });
  await assign.getByLabel('Buscar professor').fill('Vera');
  await assign
    .getByRole('combobox', { name: 'Professor' })
    .selectOption({ label: `Vera Convidada (${email})` });
  await assign.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Professor designado.')).toBeVisible();
});

test('Menu: administrador institucional vê Pessoas, e não Turmas', async ({ page }) => {
  await login(page, scenario.institutionAdmin.email, PASSWORD);
  const menu = page.getByRole('navigation').first();
  await expect(menu.getByRole('link', { name: /Professores e alunos|Pessoas/ })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Turmas' })).toHaveCount(0);
  await page.goto('/admin/turmas');
  await expect(page).toHaveURL(/dashboard/);
});
