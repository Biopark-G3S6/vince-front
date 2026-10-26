import { expect, test, type Page } from '@playwright/test';
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';

import { setSession } from './auth';

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T15:00:00Z'));
});

async function modelFile() {
  return {
    buffer: await Packer.toBuffer(
      new Document({
        sections: [
          {
            children: [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                text: 'Modelo importado de pesquisa',
              }),
              new Paragraph('Texto do arquivo Word preservado na importação.'),
            ],
          },
        ],
      }),
    ),
    mimeType: DOCX_TYPE,
    name: 'modelo-pesquisa.docx',
  };
}

async function createFromModel(page: Page, modelTitle: string, articleTitle: string) {
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: modelTitle, exact: true }) })
    .first();
  await card.getByRole('button', { name: 'Usar este modelo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo artigo', exact: true });
  await dialog.getByLabel('Título do artigo', { exact: true }).fill(articleTitle);
  await dialog.getByRole('button', { name: 'Criar artigo', exact: true }).click();
  await expect(page).toHaveURL(/\/artigos\/editor\?artigo=/);
  await expect(page.getByLabel('Corpo do artigo', { exact: true })).toHaveAttribute(
    'contenteditable',
    'true',
  );
}

for (const role of ['Aluno', 'Orientador', 'Coordenador'] as const) {
  test(`${role}: escolhe resumo expandido e edita um novo artigo`, async ({ page }) => {
    await setSession(page, role);
    await page.goto('/artigos/modelo');
    await expect(page.getByRole('heading', { name: 'Modelos padrão', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Artigo científico', exact: true }).first(),
    ).toBeVisible();
    await createFromModel(page, 'Resumo expandido', `Resumo de pesquisa ${role}`);
    await expect(page.getByLabel('Corpo do artigo', { exact: true })).toContainText(
      'Palavras-chave',
    );
    await page.reload();
    await expect(page.getByLabel('Corpo do artigo', { exact: true })).toContainText(
      'Palavras-chave',
    );
  });
}

test('aluno: importa modelo Word pessoal e preserva o conteúdo no novo artigo', async ({
  page,
}) => {
  await setSession(page, 'Aluno');
  await page.goto('/artigos/modelo');
  await page.getByRole('button', { name: 'Importar modelo', exact: true }).click();
  await page.getByLabel('Arquivo do modelo', { exact: true }).setInputFiles(await modelFile());
  await expect(page.getByLabel('Conteúdo inicial do modelo', { exact: true })).toContainText(
    'Texto do arquivo Word preservado',
  );
  await page.getByLabel('Nome do modelo', { exact: true }).fill('Meu modelo importado');
  await page.getByRole('button', { name: 'Salvar modelo', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Meu modelo importado', exact: true }),
  ).toBeVisible();
  await page.reload();
  await createFromModel(page, 'Meu modelo importado', 'Artigo com meu modelo Word');
  await expect(page.getByLabel('Corpo do artigo', { exact: true })).toContainText(
    'Texto do arquivo Word preservado',
  );
});

async function createEvent(page: Page, independent = false) {
  const createLabel = independent ? 'Criar evento independente' : 'Cadastrar evento';
  await page.getByRole('button', { name: createLabel, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: createLabel, exact: true });
  await dialog
    .getByLabel('Nome do evento', { exact: true })
    .fill(independent ? 'TCC independente E2E' : 'Mostra aberta E2E');
  await dialog.getByLabel('Tema', { exact: true }).fill('Pesquisa aplicada');
  if (independent) await dialog.getByLabel('Tipo de evento', { exact: true }).selectOption('tcc');
  await dialog.getByLabel('Modelo do evento', { exact: true }).selectOption('standard-article');
  await dialog.getByLabel('Data inicial', { exact: true }).fill('2027-03-10');
  await dialog.getByLabel('Data final', { exact: true }).fill('2027-06-30');
  await dialog.getByRole('button', { name: createLabel, exact: true }).click();
  await expect(dialog).toBeHidden();
}

for (const publisher of ['Orientador', 'Coordenador'] as const) {
  test(`${publisher}: publica modelo oficial e aluno se inscreve e cria artigo`, async ({
    page,
  }) => {
    await setSession(page, 'Coordenador');
    await page.goto('/admin/eventos');
    await createEvent(page);

    await setSession(page, 'Aluno');
    await page.goto('/admin/eventos');
    await expect(page.getByRole('heading', { name: 'Mostra aberta E2E', exact: true })).toHaveCount(
      0,
    );
    await setSession(page, 'Coordenador');
    await page.goto('/admin/eventos');
    await page.getByRole('button', { name: 'Abrir inscrições', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Encerrar inscrições', exact: true }),
    ).toBeVisible();

    await setSession(page, publisher);
    await page.goto('/admin/eventos');
    await page.getByRole('link', { name: 'Modelos e importação', exact: true }).click();
    await page.getByRole('button', { name: 'Importar modelo', exact: true }).click();
    await page.getByLabel('Arquivo do modelo', { exact: true }).setInputFiles(await modelFile());
    await expect(page.getByLabel('Conteúdo inicial do modelo', { exact: true })).toContainText(
      'Texto do arquivo Word preservado',
    );
    await page.getByLabel('Nome do modelo', { exact: true }).fill('Modelo oficial da mostra');
    await page
      .getByRole('combobox', { name: 'Disponibilidade', exact: true })
      .selectOption('event');
    await page.getByRole('button', { name: 'Salvar modelo', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Modelo oficial da mostra', exact: true }),
    ).toBeVisible();

    await setSession(page, 'Aluno');
    await page.goto('/artigos/modelo');
    const officialCard = page.locator('article').filter({
      has: page.getByRole('heading', { name: 'Modelo oficial da mostra', exact: true }),
    });
    await officialCard.getByRole('button', { name: 'Usar este modelo', exact: true }).click();
    const newArticle = page.getByRole('dialog', { name: 'Novo artigo', exact: true });
    await newArticle.getByLabel('Título do artigo', { exact: true }).fill('Ainda sem inscrição');
    await expect(
      newArticle.getByRole('button', { name: 'Criar artigo', exact: true }),
    ).toBeDisabled();
    await newArticle.getByRole('button', { name: 'Cancelar', exact: true }).click();

    await page.goto('/admin/eventos');
    const eventCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Mostra aberta E2E', exact: true }) });
    await eventCard.getByRole('button', { name: 'Inscrever-me', exact: true }).click();
    const registration = page.getByRole('dialog', { name: 'Inscrever-me no evento', exact: true });
    await registration.getByRole('button', { name: 'Confirmar inscrição', exact: true }).click();
    await expect(registration).toBeHidden();
    await page.reload();
    await expect(eventCard).toContainText('Inscrição confirmada');
    await eventCard
      .getByRole('link', { name: 'Escolher modelo e criar artigo', exact: true })
      .click();
    await createFromModel(page, 'Modelo oficial da mostra', 'Minha participação na mostra');
    await expect(page.getByLabel('Corpo do artigo', { exact: true })).toContainText(
      'Texto do arquivo Word preservado',
    );
  });
}

test('professor: cria TCC, usa seu modelo e gerencia sem acompanhamento da coordenação', async ({
  page,
}) => {
  await setSession(page, 'Orientador');
  await page.goto('/admin/eventos');
  await createEvent(page, true);
  await expect(
    page.getByRole('heading', { name: 'Meus eventos independentes', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'TCC independente E2E', exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Modelos e importação', exact: true }).click();
  await createFromModel(page, 'Resumo expandido', 'Artigo privado do TCC');
  const privateArticleURL = page.url();

  await setSession(page, 'Coordenador');
  await page.goto('/admin/eventos');
  await expect(
    page.getByRole('heading', { name: 'TCC independente E2E', exact: true }),
  ).toHaveCount(0);
  await page.goto('/admin/artigos');
  await expect(page.getByText('Artigo privado do TCC', { exact: true })).toHaveCount(0);
  await page.goto(privateArticleURL);
  await expect(page.getByLabel('Corpo do artigo', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Artigo fora do seu alcance', { exact: true })).toBeVisible();
});
