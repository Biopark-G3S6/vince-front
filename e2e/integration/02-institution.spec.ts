import { expect, test } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ApiSession,
  inviteToInstitution,
  PASSWORD,
  uniqueSuffix,
} from './support/api';
import { login, shot } from './support/ui';

/** Tela de Instituição: RF-INS-001 (manter) e RF-INS-002 (designar administrador). */
test('INS-001/002: cadastra, altera, designa e revoga administrador, desativa e reativa', async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const name = `Faculdade Integração ${suffix}`;
  const code = `FI${suffix}`.toUpperCase().slice(0, 20);
  const newAdminEmail = `nova.admin.${suffix}@e2e.test`;
  const cnpj = String(Date.now()).slice(-12).padStart(12, '0') + '01';

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto('/admin/instituicoes');

  // Cadastro com administrador inicial sem conta: vira convite (RF-ACS-009).
  await page.getByRole('button', { name: 'Nova instituição' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova instituição' });
  await dialog.getByLabel('Nome institucional').fill(name);
  await dialog.getByLabel('Sigla').fill(code);
  await dialog.getByLabel('CNPJ / identificador').fill(cnpj);
  await dialog.getByLabel('Domínio institucional').fill('integracao.edu.br');
  await dialog.getByLabel('Cidade').fill('Toledo');
  await dialog.getByLabel('UF').fill('pr');
  await dialog.getByLabel('E-mail de suporte').fill('suporte@integracao.edu.br');
  await dialog.getByLabel('E-mail do administrador').fill(newAdminEmail);
  await dialog.getByRole('button', { name: 'Salvar instituição' }).click();
  await expect(page.getByText('Instituição cadastrada.')).toBeVisible();
  await expect(page.getByText('Convite de administrador emitido.')).toBeVisible();
  await page.keyboard.press('Escape');

  // Unicidade: o mesmo CNPJ é recusado com a mensagem do campo.
  await page.getByRole('button', { name: 'Nova instituição' }).click();
  await dialog.getByLabel('Nome institucional').fill(`${name} Duplicada`);
  await dialog.getByLabel('Sigla').fill(`D${code}`.slice(0, 20));
  await dialog.getByLabel('CNPJ / identificador').fill(cnpj);
  await dialog.getByRole('button', { name: 'Salvar instituição' }).click();
  await expect(page.getByText('Já existe instituição com este CNPJ.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();

  await page.getByPlaceholder('Buscar por nome, sigla, domínio ou identificador...').fill(suffix);
  await page.getByRole('button', { name: `Detalhes de ${name}` }).click();

  // Abre os detalhes da nova instituição; os dados vieram da API.
  const details = page.getByRole('dialog', { name: name });
  await expect(details).toBeVisible();
  await expect(details.getByLabel('Cidade')).toHaveValue('Toledo');
  await expect(details.getByLabel('UF')).toHaveValue('PR');
  await expect(details.getByLabel('Domínio')).toHaveValue('integracao.edu.br');
  await shot(page, 'ins-01-detalhes');

  // Alteração persistida.
  await details.getByLabel('Cidade').fill('Cascavel');
  await details.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Dados da instituição atualizados.')).toBeVisible();

  // Designação de quem já tem conta na instituição (RF-INS-002).
  const admin = await ApiSession.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const institutions = await admin.get<{ id: string; name: string }[]>(
    `/institutions?pageSize=100&page=1`,
  );
  let institutionId = institutions.find((item) => item.name === name)?.id;
  for (let pageNumber = 2; !institutionId && pageNumber < 20; pageNumber += 1) {
    const more = await admin.get<{ id: string; name: string }[]>(
      `/institutions?pageSize=100&page=${pageNumber}`,
    );
    if (more.length === 0) break;
    institutionId = more.find((item) => item.name === name)?.id;
  }
  expect(institutionId).toBeTruthy();
  // O administrador de sistema só convida administrador institucional; quem convida o
  // professor é o administrador da instituição.
  const institutionAdmin = await inviteToInstitution(
    admin,
    institutionId!,
    'INSTITUTION_ADMIN',
    'Igor Administrador',
    suffix,
  );
  const igor = await ApiSession.login(institutionAdmin.email, PASSWORD);
  const professor = await inviteToInstitution(
    igor,
    institutionId!,
    'PROFESSOR',
    'Helena Futura',
    suffix,
  );

  await details.getByLabel('E-mail do administrador').fill(professor.email);
  await details.getByRole('button', { name: 'Designar' }).click();
  await expect(page.getByText('Administrador designado.')).toBeVisible();
  await expect(details.getByText('Helena Futura')).toBeVisible();
  await shot(page, 'ins-02-admin-designado');

  // O papel passa a valer para a designada.
  const helena = await ApiSession.login(professor.email, PASSWORD);
  expect((await helena.get<{ roles: string[] }>('/identity')).roles).toContain('INSTITUTION_ADMIN');

  await details.getByRole('button', { name: 'Revogar administrador Helena Futura' }).click();
  await expect(page.getByText('Vínculo do administrador revogado.')).toBeVisible();
  await expect(details.getByText('Helena Futura')).toHaveCount(0);

  // Desativação e reativação.
  await details.getByRole('button', { name: 'Desativar instituição' }).click();
  await page
    .getByRole('alertdialog', { name: 'Desativar instituição?' })
    .or(page.getByRole('dialog', { name: 'Desativar instituição?' }))
    .getByRole('button', { name: 'Desativar instituição' })
    .click();
  await expect(page.getByText('Instituição desativada.')).toBeVisible();

  await page.reload();
  await page.getByPlaceholder('Buscar por nome, sigla, domínio ou identificador...').fill(suffix);
  const row = page.locator('article', { hasText: name });
  await expect(row).toContainText('Inativo');
  await expect(row).toContainText('Cascavel, PR');
  await shot(page, 'ins-03-lista-inativa');

  await row.getByRole('button', { name: `Detalhes de ${name}` }).click();
  await page
    .getByRole('dialog', { name: name })
    .getByRole('button', { name: 'Reativar instituição' })
    .click();
  await expect(page.getByText('Instituição reativada.')).toBeVisible();
  await expect(row).toContainText('Ativo');
});
