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
  await dialog.getByLabel('Sigla', { exact: true }).fill(code);
  await dialog.getByLabel('CNPJ / identificador', { exact: true }).fill(cnpj);
  await dialog.getByLabel('Domínio institucional').fill('integracao.edu.br');
  await dialog.getByLabel('Cidade', { exact: true }).fill('Toledo');
  await dialog.getByLabel('UF', { exact: true }).fill('pr');
  await dialog.getByLabel('E-mail de suporte', { exact: true }).fill('suporte@integracao.edu.br');
  await dialog.getByLabel('E-mail do administrador', { exact: true }).fill(newAdminEmail);
  await dialog.getByRole('button', { name: 'Salvar instituição' }).click();
  await expect(page.getByText('Instituição cadastrada.')).toBeVisible();
  await expect(page.getByText('Convite de administrador emitido.')).toBeVisible();
  await page.keyboard.press('Escape');

  // Unicidade: o mesmo CNPJ é recusado com a mensagem do campo.
  await page.getByRole('button', { name: 'Nova instituição' }).click();
  await dialog.getByLabel('Nome institucional').fill(`${name} Duplicada`);
  await dialog.getByLabel('Sigla', { exact: true }).fill(`D${code}`.slice(0, 20));
  await dialog.getByLabel('CNPJ / identificador', { exact: true }).fill(cnpj);
  await dialog.getByRole('button', { name: 'Salvar instituição' }).click();
  await expect(page.getByText('Já existe instituição com este CNPJ.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();

  await page.getByPlaceholder('Buscar por nome, sigla, domínio ou identificador...').fill(suffix);
  await page.getByRole('button', { name: `Detalhes de ${name}` }).click();

  // Abre os detalhes da nova instituição; os dados vieram da API.
  const details = page.getByRole('dialog', { name: name });
  await expect(details).toBeVisible();
  await expect(details.getByLabel('Cidade', { exact: true })).toHaveValue('Toledo');
  await expect(details.getByLabel('UF', { exact: true })).toHaveValue('PR');
  await expect(details.getByLabel('Domínio', { exact: true })).toHaveValue('integracao.edu.br');
  await shot(page, 'ins-01-detalhes');

  // Alteração persistida.
  await details.getByLabel('Cidade', { exact: true }).fill('Cascavel');
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

  await details.getByLabel('E-mail do administrador', { exact: true }).fill(professor.email);
  await details.getByRole('button', { name: 'Designar ou convidar' }).click();
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

test('INS-002: convite de administrador pela tela — aceito vira vínculo, pendente é revogável', async ({
  page,
  browser,
}) => {
  const suffix = uniqueSuffix();
  const admin = await ApiSession.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const institution = await admin.post<{ id: string; name: string }>('/institutions', {
    name: `Convites ${suffix}`,
    code: `CV${suffix}`.toUpperCase().slice(0, 20),
  });

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto('/admin/instituicoes');
  await page.getByPlaceholder('Buscar por nome, sigla, domínio ou identificador...').fill(suffix);
  await page.getByRole('button', { name: `Detalhes de ${institution.name}` }).click();
  const details = page.getByRole('dialog', { name: institution.name });

  // Instituição sem domínio continua editável (o domínio é opcional).
  await details.getByLabel('Cidade', { exact: true }).fill('Maringá');
  await details.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Dados da instituição atualizados.')).toBeVisible();

  // Convite com validade escolhida: o link aparece e o convite fica pendente.
  const invitedEmail = `convidada.${suffix}@e2e.test`;
  await details.getByLabel('E-mail do administrador', { exact: true }).fill(invitedEmail);
  await details.getByRole('combobox', { name: 'Validade do convite' }).selectOption('15');
  await details.getByRole('button', { name: 'Designar ou convidar' }).click();
  await expect(details.getByText('Link do convite:')).toBeVisible();
  const link = (await details.getByText(/\/invitations\//).textContent()) ?? '';
  const invitedCard = details.locator('article', { hasText: invitedEmail });
  await expect(invitedCard).toContainText('Pendente');
  await expect(invitedCard).toContainText('Administrador institucional');

  // Um segundo convite, revogado pela tela: o link deixa de valer.
  const revokedEmail = `revogada.${suffix}@e2e.test`;
  await details.getByLabel('E-mail do administrador', { exact: true }).fill(revokedEmail);
  await details.getByRole('button', { name: 'Designar ou convidar' }).click();
  await expect(details.getByText(/\/invitations\//)).not.toHaveText(link);
  const revokedLink = (await details.getByText(/\/invitations\//).textContent()) ?? '';
  await details.getByRole('button', { name: `Revogar convite de ${revokedEmail}` }).click();
  await expect(page.getByText('Convite revogado.')).toBeVisible();
  await expect(details.locator('article', { hasText: revokedEmail })).toContainText('Revogado');
  await shot(page, 'ins-04-convites');

  // E-mail que já pertence a outra conta.
  await details.getByLabel('E-mail do administrador', { exact: true }).fill(ADMIN_EMAIL);
  await details.getByRole('button', { name: 'Designar ou convidar' }).click();
  await expect(page.getByText(/já pertence a uma conta de outra instituição/)).toBeVisible();

  // A convidada aceita em outra sessão.
  const guest = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const guestPage = await guest.newPage();
  await guestPage.goto(new URL(revokedLink.trim()).pathname);
  await expect(guestPage.getByRole('alert')).toBeVisible();
  await guestPage.goto(new URL(link.trim()).pathname);
  await guestPage.getByLabel('Nome completo').fill('Carla Convidada');
  await guestPage.getByLabel('Nova senha').fill(PASSWORD);
  await guestPage.getByLabel('Confirmar senha').fill(PASSWORD);
  await guestPage.getByRole('button', { name: 'Criar conta' }).click();
  await expect(guestPage.getByRole('status')).toContainText('Conta criada');
  await guest.close();

  // Vira administradora vinculada: aparece na lista e o convite consta como aceito.
  await page.reload();
  await page.getByPlaceholder('Buscar por nome, sigla, domínio ou identificador...').fill(suffix);
  await page.getByRole('button', { name: `Detalhes de ${institution.name}` }).click();
  const reopened = page.getByRole('dialog', { name: institution.name });
  await expect(reopened.getByText('Carla Convidada')).toBeVisible();
  await expect(reopened.locator('article', { hasText: invitedEmail })).toContainText('Aceito');

  // A revogação pela tela tem efeito: o vínculo e o papel caem (RF-INS-002 RN3).
  await reopened.getByRole('button', { name: 'Revogar administrador Carla Convidada' }).click();
  await expect(page.getByText('Vínculo do administrador revogado.')).toBeVisible();
  await expect(reopened.getByText('Carla Convidada')).toHaveCount(0);
  const carla = await ApiSession.login(invitedEmail, PASSWORD);
  expect((await carla.get<{ roles: string[] }>('/identity')).roles).not.toContain(
    'INSTITUTION_ADMIN',
  );
});
