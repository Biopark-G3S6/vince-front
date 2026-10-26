import { expect, test, type Page } from '@playwright/test';

import { screens } from './screens';
import { loginAs, sessionRoleForPath, setSession, type DemoRole } from './auth';

// Every test receives a fresh browser context, including localStorage and sessionStorage.
// Fix only Date so the seeded review deadline remains open; timers and autosave still run.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00.000Z'));
  await setSession(page, 'Administrador');
});

async function selectPersona(page: Page, name: DemoRole) {
  await loginAs(page, name);
}

async function assertFitsViewport(page: Page) {
  const sizes = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(sizes.content, `Horizontal page overflow at ${page.url()}`).toBeLessThanOrEqual(
    sizes.viewport + 1,
  );
}

async function dismissToasts(page: Page) {
  const close = page
    .locator('[data-sonner-toast][data-removed="false"]')
    .getByRole('button', { name: 'Close toast', exact: true });
  while (await close.count()) {
    await close.first().click();
  }
}

for (const [name, path] of screens) {
  test(`tela ${name}: carrega sem erro e cabe na viewport`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await setSession(page, sessionRoleForPath(path));
    await page.goto(path);
    await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
    await expect(page).toHaveTitle(/VinceArt/);
    await expect(page.locator('body')).not.toContainText('[object Object]');
    await assertFitsViewport(page);
    expect(errors).toEqual([]);
    if (['Dashboard', 'Instituições', 'Editor', 'Templates', 'Discussão'].includes(name)) {
      const screenshotPath = testInfo.outputPath(`${testInfo.project.name}.png`);
      await page.screenshot({ fullPage: true, path: screenshotPath });
      await testInfo.attach(`${name}-${testInfo.project.name}`, {
        path: screenshotPath,
        contentType: 'image/png',
      });
    }
  });
}

test('login: valida credenciais e abre o dashboard', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('E-mail', { exact: true }).fill('pessoa@exemplo.com');
  await page.getByLabel('Senha', { exact: true }).fill('incorreta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('inválidos');
  await page.getByLabel('E-mail', { exact: true }).fill('admin@vinceart.edu.br');
  await page.getByLabel('Senha', { exact: true }).fill('vince123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

for (const account of [
  {
    dashboard: 'Visão Geral Acadêmica',
    name: 'Admin Geral',
    role: 'Administrador' as const,
  },
  {
    dashboard: 'Olá, Dr. Ricardo Santos',
    name: 'Dr. Ricardo Santos',
    role: 'Coordenador' as const,
  },
  { dashboard: 'Olá, Prof. Almeida', name: 'Prof. Almeida', role: 'Orientador' as const },
  { dashboard: 'Olá, João Pedro Silva', name: 'João Pedro Silva', role: 'Aluno' as const },
]) {
  test(`login ${account.role}: abre navegação e conteúdo próprios`, async ({ page }) => {
    await loginAs(page, account.role, false);
    await expect(page.getByRole('heading', { name: account.dashboard, exact: true })).toBeVisible();
    await expect(page.locator(`a[aria-label="${account.name}"]`)).toBeVisible();

    const institutionLinks = page.locator('a[href="/admin/instituicoes"]');
    const peopleLinks = page.locator('a[href="/admin/pessoas"]');
    const teamLinks = page.locator('a[href="/admin/equipes"]');
    if (account.role === 'Administrador') {
      await expect(institutionLinks).toHaveCount(1);
      await expect(peopleLinks).toHaveCount(0);
      await expect(teamLinks).toHaveCount(0);
    } else if (account.role === 'Coordenador') {
      await expect(institutionLinks).toHaveCount(0);
      await expect(peopleLinks).toHaveCount(2);
      await expect(teamLinks).toHaveCount(0);
    } else if (account.role === 'Orientador') {
      await expect(institutionLinks).toHaveCount(0);
      await expect(teamLinks).toHaveCount(1);
    } else {
      await expect(institutionLinks).toHaveCount(0);
      await expect(teamLinks).toHaveCount(0);
      await page.goto('/admin/instituicoes');
      await expect(page).toHaveURL(/\/admin\/dashboard$/);
      await expect(page.getByText('Instituições cadastradas', { exact: true })).toHaveCount(0);
    }

    await page.goto('/admin/acesso');
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(account.name);
    await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/entrar$/);
  });
}

test('coordenador: consulta pessoas, cadastra evento e gerencia avaliadores', async ({ page }) => {
  await loginAs(page, 'Coordenador', false);
  await page.goto('/admin/pessoas');
  await expect(
    page.getByRole('heading', { name: 'Professores e alunos', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Professores', exact: true }).click();
  await expect(page.getByText('Prof. Almeida', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Alunos', exact: true }).click();
  await page.getByLabel('Buscar professor ou aluno', { exact: true }).fill('João');
  await expect(page.getByText('João Pedro', { exact: true })).toBeVisible();

  await page.goto('/admin/eventos');
  await page.getByRole('button', { name: 'Cadastrar evento', exact: true }).click();
  const eventDialog = page.getByRole('dialog', { name: 'Cadastrar evento', exact: true });
  await eventDialog.getByLabel('Nome do evento', { exact: true }).fill('Mostra Científica E2E');
  await eventDialog.getByLabel('Tema', { exact: true }).fill('Pesquisa aplicada e inovação');
  await eventDialog.getByLabel('Data inicial', { exact: true }).fill('2027-03-10');
  await eventDialog.getByLabel('Data final', { exact: true }).fill('2027-03-20');
  await eventDialog.getByLabel('Máximo de equipes', { exact: true }).fill('12');
  await eventDialog.getByLabel('Integrantes por equipe', { exact: true }).fill('5');
  await eventDialog.getByRole('button', { name: 'Cadastrar evento', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mostra Científica E2E', exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Convidar avaliador', exact: true }).click();
  const invite = page.getByRole('dialog', { name: 'Convidar avaliador', exact: true });
  await invite.getByLabel('Nome do avaliador', { exact: true }).fill('Dra. Avaliadora E2E');
  await invite.getByLabel('E-mail do avaliador', { exact: true }).fill('avaliadora@e2e.edu.br');
  await invite.getByLabel('Área de especialidade', { exact: true }).fill('Inovação');
  await invite.getByRole('button', { name: 'Enviar convite', exact: true }).click();
  await expect(page.getByText('Convite pendente', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Cadastrar avaliador', exact: true }).click();
  const evaluator = page.getByRole('dialog', { name: 'Cadastrar avaliador', exact: true });
  await evaluator.getByLabel('Nome do avaliador', { exact: true }).fill('Prof. Avaliador Ativo');
  await evaluator.getByLabel('E-mail do avaliador', { exact: true }).fill('ativo@e2e.edu.br');
  await evaluator.getByLabel('Área de especialidade', { exact: true }).fill('Metodologia');
  await evaluator.getByRole('button', { name: 'Cadastrar avaliador', exact: true }).click();
  await expect(page.getByText('Prof. Avaliador Ativo', { exact: true })).toBeVisible();
  await expect(page.getByText('Cadastrado', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Mostra Científica E2E', exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('Dra. Avaliadora E2E', { exact: true })).toBeVisible();
});

test('navegação: menu permite abrir equipes e voltar aos artigos', async ({ page, isMobile }) => {
  await page.goto('/admin/dashboard');
  await selectPersona(page, 'Orientador');
  if (!isMobile) {
    await page.getByRole('button', { name: 'Recolher menu', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Expandir menu', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await assertFitsViewport(page);
    await page.getByRole('button', { name: 'Expandir menu', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Recolher menu', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  }
  if (isMobile) {
    await expect(page.getByRole('navigation', { name: 'Menu administrativo' })).toBeHidden();
    await page.getByRole('button', { name: /Expandir menu|Abrir menu/ }).click();
  }
  await page
    .getByRole('navigation', { name: 'Menu administrativo' })
    .getByRole('link', { name: 'Minhas equipes', exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/equipes$/);
  await expect(page.getByRole('heading', { name: 'Equipes', exact: true })).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: /Expandir menu|Abrir menu/ }).click();
  }
  await page
    .getByRole('navigation', { name: 'Menu administrativo' })
    .getByRole('link', { name: 'Artigos orientados', exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/artigos$/);
  await expect(
    page.getByRole('heading', { name: 'Artigos orientados', exact: true }),
  ).toBeVisible();
});

test('equipe: valida cadastro, cria artigo e preserva edição após recarregar', async ({ page }) => {
  await selectPersona(page, 'Orientador');
  await page.goto('/admin/equipes');
  await page.getByRole('button', { name: 'Criar equipe', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Criar equipe', exact: true });
  await dialog.getByRole('button', { name: 'Criar equipe e artigo' }).click();
  await expect(
    page.getByText('Informe o nome da equipe, o título do artigo e ao menos um integrante.'),
  ).toBeVisible();
  await dialog.getByLabel('Nome da equipe').fill('Equipe E2E');
  await dialog.getByLabel('Título do artigo').fill('Pesquisa de fluxo E2E');
  await dialog.getByRole('button', { name: 'Criar equipe e artigo' }).click();
  await expect(page).toHaveURL(/\/artigos\/editor\?artigo=article-/);
  await selectPersona(page, 'Aluno');
  const article = page.getByLabel('Corpo do artigo', { exact: true });
  await expect(article).toHaveAttribute('contenteditable', 'true');
  await article.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('Evidência de edição persistida no navegador.');
  await expect(article).toContainText('Evidência de edição persistida no navegador.');
  await expect
    .poll(async () => page.evaluate(() => JSON.stringify(localStorage)))
    .toContain('Evidência de edição persistida no navegador.');
  await page.reload();
  await expect(page.getByLabel('Corpo do artigo', { exact: true })).toContainText(
    'Evidência de edição persistida no navegador.',
  );
  await page.goto('/admin/artigos');
  const registered = page.locator('li').filter({ hasText: 'Pesquisa de fluxo E2E' });
  await expect(registered).toContainText('Equipe E2E');
  await registered.getByRole('link', { name: 'Discussão', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Pesquisa de fluxo E2E', exact: true }),
  ).toBeVisible();
});

test('discussão: publica, responde em outra aba e restringe acesso por perfil', async ({
  page,
  context,
}) => {
  await selectPersona(page, 'Aluno');
  await page.goto('/admin/discussao');
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByText('Escreva a mensagem antes de publicar.')).toBeVisible();
  const advisor = await context.newPage();
  await advisor.clock.setFixedTime(new Date('2026-10-15T12:00:00.000Z'));
  await advisor.goto('/admin/discussao');
  await selectPersona(advisor, 'Orientador');
  await advisor.goto('/admin/discussao');
  await expect(advisor.getByLabel('Nova mensagem', { exact: true })).toBeVisible();
  await page
    .getByLabel('Nova mensagem', { exact: true })
    .fill('Professor, pode verificar nossa metodologia E2E?');
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(
    advisor.getByText('Professor, pode verificar nossa metodologia E2E?', { exact: true }),
  ).toBeVisible();
  const thread = advisor
    .locator('article')
    .filter({ hasText: 'Professor, pode verificar nossa metodologia E2E?' });
  await thread.getByRole('button', { name: 'Responder', exact: true }).click();
  await thread.getByRole('textbox').fill('Metodologia revisada pelo orientador E2E.');
  await thread.getByRole('button', { name: 'Enviar resposta' }).click();
  await expect(
    page.getByText('Metodologia revisada pelo orientador E2E.', { exact: true }),
  ).toBeVisible();
  const ownMessage = page
    .locator('[id^="mensagem-"]')
    .filter({ hasText: 'Professor, pode verificar nossa metodologia E2E?' });
  await ownMessage.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByText('A mensagem original foi excluída.', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Metodologia revisada pelo orientador E2E.', { exact: true }),
  ).toBeVisible();
  await selectPersona(page, 'Coordenador');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByText('Você não participa desta discussão', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel('Nova mensagem', { exact: true })).toHaveCount(0);
  await advisor.close();
});

test('correção: entrega, desfaz, registra apontamento e devolve ao aluno', async ({ page }) => {
  await selectPersona(page, 'Aluno');
  await page.goto('/admin/correcao');
  await page.getByRole('button', { name: 'Entregar etapa', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Entregar etapa', exact: true })
    .click();
  await expect(
    page.getByText('Etapa entregue. O orientador foi notificado.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer entrega', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entregar etapa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Entregar etapa', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Entregar etapa', exact: true })
    .click();
  await selectPersona(page, 'Orientador');
  await page.getByRole('button', { name: 'Apontar neste parágrafo', exact: true }).first().click();
  await page
    .getByLabel('O que deve ser corrigido', { exact: true })
    .fill('Acrescentem a fonte da pesquisa E2E.');
  await page.getByRole('button', { name: 'Registrar apontamento', exact: true }).click();
  await expect(page.getByText('Apontamento registrado.', { exact: true })).toBeVisible();
  await selectPersona(page, 'Aluno');
  await expect(page.getByText('Acrescentem a fonte da pesquisa E2E.', { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Desfazer entrega', exact: true }).click();
  await expect(
    page.getByText('A correção já foi iniciada; a entrega não pode ser desfeita.'),
  ).toBeVisible();
  await selectPersona(page, 'Orientador');
  await page.getByRole('button', { name: 'Devolver à equipe', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Devolver à equipe', exact: true })
    .click();
  await expect(
    page.getByText('Artigo devolvido. A equipe foi notificada.', { exact: true }),
  ).toBeVisible();
  await selectPersona(page, 'Aluno');
  await expect(
    page.getByText('Acrescentem a fonte da pesquisa E2E.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entregar etapa', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Entregas', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Referencial teórico', exact: true })).toBeVisible();
});

test('instituição: cria, edita, impede administrador duplicado e confirma desativação', async ({
  page,
}) => {
  await page.goto('/admin/instituicoes');
  await page.getByRole('button', { name: 'Nova instituição', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Nova instituição', exact: true });
  await create.getByLabel('Nome institucional', { exact: true }).fill('Instituição de testes E2E');
  await create.getByLabel('Sigla', { exact: true }).fill('E2E');
  await create.getByLabel('CNPJ / identificador', { exact: true }).fill('12.345.678/0001-90');
  await create
    .getByLabel('Domínio institucional', { exact: true })
    .fill('https://instituicao.edu.br');
  await create.getByLabel('Cidade', { exact: true }).fill('São Paulo');
  await create.getByLabel('UF', { exact: true }).fill('SP');
  await create.getByLabel('E-mail de suporte', { exact: true }).fill('suporte@instituicao.edu.br');
  await create.getByRole('button', { name: 'Salvar instituição', exact: true }).click();
  await expect(
    page.getByText('Informe apenas o domínio institucional, como instituicao.edu.br.', {
      exact: true,
    }),
  ).toBeVisible();
  await create.getByLabel('Domínio institucional', { exact: true }).fill('instituicao.edu.br');
  await create.getByRole('button', { name: 'Salvar instituição', exact: true }).click();
  const details = page.getByRole('dialog', { name: /^Instituição de testes E2E/ });
  await expect(details).toBeVisible();
  await details.getByLabel('Nome', { exact: true }).fill('Instituição de testes E2E revisada');
  await details.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(
    details.getByRole('heading', { name: 'Instituição de testes E2E revisada', exact: true }),
  ).toBeVisible();
  await details.getByLabel('Nome do administrador', { exact: true }).fill('Ana E2E');
  await details
    .getByLabel('E-mail do administrador', { exact: true })
    .fill('ana@instituicao.edu.br');
  await details.getByRole('button', { name: 'Designar', exact: true }).click();
  await expect(details.getByText('ana@instituicao.edu.br', { exact: true })).toBeVisible();
  await details.getByLabel('Nome do administrador', { exact: true }).fill('Ana duplicada');
  await details
    .getByLabel('E-mail do administrador', { exact: true })
    .fill('ANA@instituicao.edu.br');
  await details.getByRole('button', { name: 'Designar', exact: true }).click();
  await expect(
    page.getByText('Este administrador já está vinculado à instituição.', { exact: true }),
  ).toBeVisible();
  await expect(details.getByRole('button', { name: /Revogar administrador/ })).toHaveCount(1);
  await details.getByRole('button', { name: 'Desativar instituição', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Desativar instituição?', exact: true });
  await confirm.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(details.getByText('Ativa', { exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Desativar instituição', exact: true }).click();
  await confirm.getByRole('button', { name: 'Desativar instituição', exact: true }).click();
  await expect(details.getByText('Inativa', { exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Reativar instituição', exact: true }).click();
  await expect(details.getByText('Ativa', { exact: true })).toBeVisible();
  await assertFitsViewport(page);
  await details.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByLabel('Buscar instituições', { exact: true }).fill('E2E revisada');
  await expect(
    page.getByRole('heading', { name: 'Instituição de testes E2E revisada', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Mostrando 1 de 4 instituições', { exact: false })).toBeVisible();
});

test('assistência e acompanhamento: percorre abas, verifica artigo e gera relatório', async ({
  page,
}) => {
  await selectPersona(page, 'Orientador');
  await page.goto('/admin/assistencia');
  for (const name of [
    'Resumo das alterações',
    'Conformidade à norma',
    'Similaridade',
    'Indícios de autoria',
    'Consentimento de IA',
  ]) {
    const tab = page.getByRole('tab', { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
    if (name === 'Conformidade à norma' || name === 'Similaridade') {
      await page.getByRole('button', { name: 'Verificar agora', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Verificar novamente', exact: true }),
      ).toBeVisible();
    }
    await assertFitsViewport(page);
  }
  await selectPersona(page, 'Aluno');
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', { name: 'Indícios de autoria', exact: true })).toHaveCount(0);
  await selectPersona(page, 'Orientador');
  await page.goto('/admin/acompanhamento');
  for (const name of ['Minhas equipes', 'Contribuição']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await assertFitsViewport(page);
  }
  await selectPersona(page, 'Coordenador');
  await page.getByRole('tab', { name: 'Eventos do curso', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await assertFitsViewport(page);
  await page.getByRole('tab', { name: 'Relatório de produção', exact: true }).click();
  await page.getByRole('button', { name: 'Gerar relatório', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exportar CSV', exact: true })).toBeVisible();
  await assertFitsViewport(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  await expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await selectPersona(page, 'Aluno');
  await page.goto('/admin/correcao');
  for (const name of ['Comparar versões', 'Entregas', 'Correção']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await assertFitsViewport(page);
  }
  await page.getByRole('tab', { name: 'Correção', exact: true }).focus();
  for (const [key, selected] of [
    ['ArrowRight', 'Comparar versões'],
    ['End', 'Entregas'],
    ['Home', 'Correção'],
    ['ArrowLeft', 'Entregas'],
  ]) {
    await page.keyboard.press(key!);
    await expect(page.getByRole('tab', { name: selected!, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }
});

test('editor: abre referências e histórico, salva versão e exporta documento', async ({ page }) => {
  await selectPersona(page, 'Aluno');
  await page.goto('/artigos/editor');
  await expect(page.getByLabel('Corpo do artigo', { exact: true })).toHaveAttribute(
    'contenteditable',
    'true',
  );
  await page.keyboard.press('Control+s');
  await expect(page.getByText('Versão salva.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Histórico de versões', exact: true }).click();
  const history = page.getByRole('dialog', { name: 'Histórico', exact: true });
  await expect(history).toBeVisible();
  await history
    .getByRole('button', { name: /Versão salva pelo autor/ })
    .first()
    .click();
  await expect(
    history.getByRole('button', { name: 'Restaurar este estado', exact: true }),
  ).toBeVisible();
  await assertFitsViewport(page);
  await history.getByRole('button', { name: 'Fechar painel', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Menu do editor', exact: true })
    .getByRole('button', { name: 'Revisão', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Referências bibliográficas', exact: true }).click();
  const references = page.getByRole('dialog', { name: 'Referências', exact: true });
  await expect(references).toBeVisible();
  await assertFitsViewport(page);
  await references.getByRole('button', { name: 'Nova referência', exact: true }).click();
  await expect(references.getByRole('combobox', { name: 'Tipo', exact: true })).toBeVisible();
  await assertFitsViewport(page);
  await page.keyboard.press('Escape');
  await expect(references).toHaveCount(0);
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Documento Word (.docx)', exact: true }).click();
  await expect((await download).suggestedFilename()).toMatch(/\.docx$/);
});

test('templates: preserva a versão do evento ao atualizar o modelo e criar uma equipe', async ({
  page,
}) => {
  await page.goto('/admin/templates');
  await page.getByRole('button', { name: 'Criar modelo', exact: true }).click();
  await page.getByLabel('Nome do modelo', { exact: true }).fill('Modelo de pesquisa E2E');
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Modelo para testar a versão congelada do evento.');
  await page
    .getByLabel('Conteúdo inicial do modelo', { exact: true })
    .fill('Conteúdo original da primeira versão do modelo.');
  await assertFitsViewport(page);
  await page.getByRole('button', { name: 'Salvar modelo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Modelo de pesquisa E2E', exact: true }),
  ).toBeVisible();
  await dismissToasts(page);

  await page.goto('/admin/eventos');
  await page.getByRole('button', { name: 'Cadastrar evento', exact: true }).click();
  const eventDialog = page.getByRole('dialog', { name: 'Cadastrar evento', exact: true });
  await eventDialog.getByLabel('Nome do evento', { exact: true }).fill('Evento com modelo E2E');
  await eventDialog.getByLabel('Tema', { exact: true }).fill('Pesquisa com versão congelada');
  await eventDialog
    .getByLabel('Modelo do evento', { exact: true })
    .selectOption({ label: 'Modelo de pesquisa E2E' });
  await eventDialog.getByLabel('Data inicial', { exact: true }).fill('2027-03-10');
  await eventDialog.getByLabel('Data final', { exact: true }).fill('2027-06-30');
  await eventDialog.getByRole('button', { name: 'Cadastrar evento', exact: true }).click();
  await expect(eventDialog).toBeHidden();
  await expect(page.getByText('Modelo de pesquisa E2E · versão 1', { exact: true })).toBeVisible();

  await page.goto('/admin/templates');
  const personalCard = page
    .locator('section[aria-labelledby="personal-models-title"]')
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Modelo de pesquisa E2E', exact: true }) });
  await personalCard.getByRole('button', { name: 'Editar modelo', exact: true }).click();
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Modelo atualizado após a criação do evento.');
  await page
    .getByLabel('Conteúdo inicial do modelo', { exact: true })
    .fill('Conteúdo revisado da segunda versão do modelo.');
  await page.getByRole('button', { name: 'Salvar nova versão', exact: true }).click();
  const eventCard = page
    .locator('section[aria-labelledby="event-models-title"]')
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Modelo de pesquisa E2E', exact: true }) });
  await expect(eventCard).toContainText('Versão 1');
  await personalCard.getByRole('button', { name: 'Editar modelo', exact: true }).click();
  await expect(page.getByLabel('Conteúdo inicial do modelo', { exact: true })).toContainText(
    'Conteúdo revisado da segunda versão do modelo.',
  );
  await expect(page.getByRole('listitem').filter({ hasText: /^Versão 2 —/ })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

  await page.goto('/admin/eventos');
  await expect(page.getByText('Modelo de pesquisa E2E · versão 1', { exact: true })).toBeVisible();
  await selectPersona(page, 'Orientador');
  await page.goto('/admin/equipes');
  await page.getByRole('button', { name: 'Criar equipe', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Criar equipe', exact: true });
  await dialog
    .getByRole('combobox', { name: /^Evento/ })
    .selectOption({ label: 'Evento com modelo E2E' });
  await expect(dialog).toContainText('Modelo de pesquisa E2E (versão 1)');
  await dialog.getByLabel('Nome da equipe', { exact: true }).fill('Equipe versão congelada');
  await dialog.getByLabel('Título do artigo', { exact: true }).fill('Artigo com o modelo original');
  await assertFitsViewport(page);
  await dialog.getByRole('button', { name: 'Criar equipe e artigo', exact: true }).click();
  await expect(page).toHaveURL(/\/artigos\/editor\?artigo=/);
  await expect(page.getByLabel('Corpo do artigo', { exact: true })).toContainText(
    'Conteúdo original da primeira versão do modelo.',
  );
  await expect(page.getByLabel('Corpo do artigo', { exact: true })).not.toContainText(
    'Conteúdo revisado da segunda versão do modelo.',
  );
  await expect(
    page.getByText('Modelo de pesquisa E2E · versão 1, definida na criação do evento', {
      exact: true,
    }),
  ).toBeVisible();
});
