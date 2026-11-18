import { expect, test } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ApiSession,
  buildScenario,
  PASSWORD,
  uniqueSuffix,
  type Scenario,
} from './support/api';
import { login, shot } from './support/ui';

/** Tela de Acesso e Autenticação: RF-ACS-001 a RF-ACS-008 (e o aceite de RF-ACS-009). */
let scenario: Scenario;

test.beforeAll(async () => {
  scenario = await buildScenario();
});

test('ACS-001: credencial errada é recusada; a certa abre o painel', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(scenario.professor.email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-incorreta-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Falha na autenticação');

  await login(page, scenario.professor.email, PASSWORD);
  await expect(page.getByText(scenario.professor.name).first()).toBeVisible();
  await shot(page, 'acs-01-painel-professor');
});

test('ACS-002: encerrar a sessão volta ao login e protege as rotas', async ({ page }) => {
  await login(page, scenario.students[0]!.email, PASSWORD);
  await page.goto('/admin/acesso');
  await page.getByRole('button', { name: 'Encerrar sessão' }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  await page.goto('/admin/acesso');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('ACS-003: recuperar acesso registra a solicitação sem revelar a conta', async ({ page }) => {
  await page.goto('/recuperar-acesso');
  await page.getByPlaceholder('exemplo@instituicao.edu.br').fill(scenario.students[1]!.email);
  await page.getByRole('button', { name: 'Enviar instruções' }).click();
  await expect(page.getByRole('status')).toContainText('Solicitação registrada');
});

test('ACS-003/004: link de redefinição inválido é recusado', async ({ page }) => {
  await page.goto('/password/reset?token=token-que-nao-existe');
  await page.getByLabel('Nova senha').fill('Senha-nova-de-teste-1');
  await page.getByLabel('Confirmar senha').fill('Senha-nova-de-teste-1');
  await page.getByRole('button', { name: 'Concluir definição' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('ACS-004/005: altera perfil e senha da própria conta', async ({ page }) => {
  const student = scenario.students[2]!;
  await login(page, student.email, PASSWORD);
  await page.goto('/admin/acesso');

  await page.getByLabel('Nome', { exact: true }).fill(`${student.name} Silva`);
  await page.getByLabel('Área de atuação ou pesquisa').fill('Ciência de dados');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.getByText('Perfil salvo')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(`${student.name} Silva`);
  await expect(page.getByLabel('Área de atuação ou pesquisa')).toHaveValue('Ciência de dados');

  const newPassword = 'Senha-alterada-2026';
  await page.getByLabel('Senha atual').fill('senha-errada-123');
  await page.getByLabel('Nova senha').fill(newPassword);
  await page.getByRole('button', { name: 'Atualizar senha' }).click();
  await expect(page.getByText('A senha atual não confere.')).toBeVisible();

  await page.getByLabel('Senha atual').fill(PASSWORD);
  await page.getByLabel('Nova senha').fill(newPassword);
  await page.getByRole('button', { name: 'Atualizar senha' }).click();
  await expect(page.getByText('Senha atualizada')).toBeVisible();
  await shot(page, 'acs-05-perfil-senha');

  // A troca de senha encerra as demais sessões; a nova senha passa a valer no login.
  const fresh = await ApiSession.login(student.email, newPassword);
  expect(await fresh.get<{ email: string }>('/identity')).toMatchObject({ email: student.email });
});

test('ACS-006/007/008: concede, consulta e revoga permissão', async ({ page }) => {
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/acesso');
  await expect(page.getByText('Concessões diretas')).toBeVisible();

  await page.getByLabel('Buscar beneficiário').fill('Otávio');
  const beneficiary = page.getByRole('combobox', { name: 'Beneficiário', exact: true });
  await expect(beneficiary).toContainText('Otávio Orientador');
  await beneficiary.selectOption({ label: `Otávio Orientador (${scenario.otherProfessor.email})` });
  await page
    .getByRole('combobox', { name: 'Permissão', exact: true })
    .selectOption('ARTICLE:GRADE');
  await page.getByRole('button', { name: 'Conceder permissão' }).click();
  await expect(page.getByText('Permissão concedida.')).toBeVisible();

  const card = page.locator('article', { hasText: 'Otávio Orientador' });
  await expect(card).toContainText('ARTICLE:GRADE');
  await expect(card).toContainText(`Concedida por ${scenario.professor.name}`);
  await shot(page, 'acs-06-concessao');

  // Ninguém concede a si mesmo, e o próprio usuário não aparece entre os beneficiários.
  await page.getByLabel('Buscar beneficiário').fill('Paula');
  await expect(beneficiary).not.toContainText('Paula Professora');

  await card.getByRole('button', { name: /Revogar concessão/ }).click();
  await expect(page.getByText('Concessão revogada.')).toBeVisible();
  await expect(page.locator('article', { hasText: 'Otávio Orientador' })).toHaveCount(0);
});

test('ACS-009: aceite de convite cria a conta pela tela', async ({ page }) => {
  const admin = await ApiSession.login(scenario.institutionAdmin.email, PASSWORD);
  const email = `convidado.${uniqueSuffix()}@e2e.test`;
  const issued = await admin.post<{ url: string }>(
    `/institutions/${scenario.institution.id}/invitations`,
    {
      roleCode: 'PROFESSOR',
      targetEmail: email,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
  );

  await page.goto(issued.url);
  await expect(
    page.getByText(`Você foi convidado como Professor em ${scenario.institution.name}.`),
  ).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(email);
  await page.getByLabel('Nome completo').fill('Gabriel Convidado');
  await page.getByLabel('Nova senha').fill(PASSWORD);
  await page.getByLabel('Confirmar senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('status')).toContainText('Conta criada');

  await login(page, email, PASSWORD);
  await expect(page.getByText('Gabriel Convidado').first()).toBeVisible();
});

test('ACS-005/008: idioma publicado, instituição e permissões da sessão, revisão por usuário', async ({
  page,
}) => {
  // Item 8: autenticado em /entrar vai ao painel.
  await login(page, scenario.students[0]!.email, PASSWORD);
  await page.goto('/entrar');
  await expect.soft(page, '/entrar com sessão').toHaveURL(/\/admin\/dashboard$/);

  // Item 3: só pt-BR nos seletores.
  await page.goto('/admin/acesso');
  const idioma = page.getByRole('combobox', { name: 'Idioma' });
  await expect.soft(idioma.locator('option')).toHaveText(['Português (Brasil)']);
  await page.goto('/admin/idioma');
  await expect.soft(page.getByRole('radio')).toHaveCount(1);
  await expect.soft(page.getByText('English (United States)')).toHaveCount(0);

  // Item 4 e 6: nome da instituição e resumo das permissões, por papel.
  const pill = (label: string) =>
    page.getByText(label, { exact: true }).locator('xpath=following-sibling::p').first();
  for (const account of [
    scenario.students[0]!,
    scenario.professor,
    scenario.coordinator,
    scenario.institutionAdmin,
  ]) {
    await login(page, account.email, PASSWORD);
    await page.goto('/admin/acesso');
    await expect
      .soft(pill('Instituição'), `instituição de ${account.name}`)
      .toHaveText(scenario.institution.name);
    await expect.soft(pill('Acesso')).toHaveText(/^\d+ permissões em \d+ áreas$/);
    console.log(`${account.name}: ${await pill('Acesso').textContent()}`);
  }
  await page.getByText('Ver permissões efetivas').click();
  await expect.soft(page.getByText('Instituição', { exact: true }).last()).toBeVisible();
  await shot(page, 'acs-08-sessao-admin-institucional');

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto('/admin/acesso');
  await expect.soft(pill('Instituição')).toHaveText('Todas as instituições');

  // Item 5: revisar as concessões de um usuário.
  const prof = await ApiSession.login(scenario.professor.email, PASSWORD);
  const [first, second] = [scenario.students[0]!, scenario.otherProfessor];
  const g1 = await prof.post<{ id: string }>('/permission-grants', {
    beneficiaryId: first.id,
    permission: 'TEAM:CREATE',
    validUntil: null,
  });
  const g2 = await prof.post<{ id: string }>('/permission-grants', {
    beneficiaryId: second.id,
    permission: 'ARTICLE:GRADE',
    validUntil: null,
  });
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/acesso');
  const review = page.getByRole('combobox', { name: 'Usuário a revisar' });
  await expect(review).toContainText(first.name);
  await expect(review).toContainText(second.name);
  await review.selectOption({ label: second.name });
  await expect.soft(page.locator('article', { hasText: second.name })).toHaveCount(1);
  await expect.soft(page.locator('article', { hasText: first.name })).toHaveCount(0);
  await shot(page, 'acs-08-revisao-por-usuario');
  await review.selectOption({ label: 'Todos os usuários' });
  await expect.soft(page.locator('article', { hasText: first.name })).toHaveCount(1);
  await prof.request('DELETE', `/permission-grants/${g1.id}`);
  await prof.request('DELETE', `/permission-grants/${g2.id}`);
});
