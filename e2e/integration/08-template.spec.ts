import { expect, test, type Page } from '@playwright/test';

import { ApiSession, buildScenario, PASSWORD, type Scenario } from './support/api';
import { login, shot } from './support/ui';

/** Tela de Template de Artigo: RF-TPL-001 (manter) e RF-TPL-002 (selecionar no evento). */
let scenario: Scenario;

test.beforeAll(async () => {
  scenario = await buildScenario();
});

async function createTemplate(page: Page, name: string, text: string, scope?: string) {
  await page.getByRole('button', { name: 'Criar modelo' }).click();
  const main = page.locator('main');
  await main.getByPlaceholder('Ex.: Resumo expandido do simpósio').fill(name);
  if (scope)
    await main.getByRole('combobox', { name: 'Escopo do modelo' }).selectOption({ label: scope });
  await main.getByLabel('Conteúdo inicial do modelo').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(text);
  await main.getByRole('button', { name: 'Salvar modelo' }).click();
}

test('TPL-001: administrador mantém modelo da instituição, com versões e desativação', async ({
  page,
}) => {
  const name = `Modelo Institucional ${scenario.suffix}`;
  await login(page, scenario.institutionAdmin.email, PASSWORD);
  await page.goto('/admin/templates');

  // O administrador escolhe entre a instituição e qualquer curso.
  await page.getByRole('button', { name: 'Criar modelo' }).click();
  await expect(
    page.locator('main').getByRole('combobox', { name: 'Escopo do modelo' }).locator('option'),
  ).toHaveText(['Toda a instituição', scenario.course.name]);
  await expect(page.getByRole('button', { name: 'Salvar modelo' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await createTemplate(page, name, 'Introdução institucional');
  await expect(page.getByText('Modelo salvo para a instituição.')).toBeVisible();
  const institution = page.getByRole('region', { name: 'Modelos da instituição' });
  const card = institution.locator('article', { hasText: name });
  await expect(card).toContainText('Versão 1');

  // Alterar gera versão nova (RN4), com autor e instante.
  await card.getByRole('button', { name: 'Editar modelo' }).click();
  await page.getByLabel('Conteúdo inicial do modelo').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' revisada');
  await page.getByRole('button', { name: 'Salvar nova versão' }).click();
  await expect(page.getByText('Modelo atualizado com uma nova versão.')).toBeVisible();
  await expect(card).toContainText('Versão 2');
  await card.getByRole('button', { name: 'Editar modelo' }).click();
  await expect(
    page.getByText(new RegExp(`Versão 2 — ${scenario.institutionAdmin.name}`)),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await shot(page, 'tpl-01-biblioteca');

  // Desativação com confirmação; o modelo passa à seção dos desativados.
  await card.getByRole('button', { name: 'Desativar modelo' }).click();
  await page
    .getByRole('dialog', { name: 'Desativar modelo?' })
    .getByRole('button', { name: 'Desativar modelo' })
    .click();
  await expect(page.getByText('Modelo desativado.')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Modelos desativados' }).locator('article', { hasText: name }),
  ).toContainText('Desativado');
});

test('TPL-001/002: coordenador mantém o do curso; o evento o adota e o artigo nasce com ele', async ({
  page,
}) => {
  const name = `Modelo do Curso ${scenario.suffix}`;
  await login(page, scenario.coordinator.email, PASSWORD);
  await page.goto('/admin/templates');

  // RN2: o coordenador só restringe ao próprio curso.
  await page.getByRole('button', { name: 'Criar modelo' }).click();
  await expect(
    page.locator('main').getByRole('combobox', { name: 'Escopo do modelo' }).locator('option'),
  ).toHaveText([scenario.course.name]);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await createTemplate(page, name, 'Semente do curso');
  await expect(page.getByText('Modelo salvo para o curso.')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Modelos dos cursos' }).locator('article', { hasText: name }),
  ).toContainText(scenario.course.name);

  // O professor só consulta; o aluno não tem a tela.
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/templates');
  const seen = page.locator('article', { hasText: name });
  await expect(seen.getByRole('button', { name: 'Consultar modelo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar modelo' })).toHaveCount(0);
  await expect(seen.getByRole('button', { name: 'Desativar modelo' })).toHaveCount(0);
  await login(page, scenario.students[0]!.email, PASSWORD);
  await page.goto('/admin/templates');
  await expect(page).toHaveURL(/dashboard/);

  // RF-TPL-002: o professor cria o evento da turma com o modelo do curso.
  const title = `Evento com modelo ${scenario.suffix}`;
  await login(page, scenario.professor.email, PASSWORD);
  await page.goto('/admin/eventos');
  await page.getByRole('button', { name: 'Novo evento' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo evento' });
  await dialog.getByRole('combobox', { name: 'Turma' }).selectOption({ index: 1 });
  await dialog.getByLabel('Título do evento').fill(title);
  await dialog.getByLabel('Tema').fill('Tema');
  await dialog.getByLabel('Problema de pesquisa').fill('Problema');
  await dialog.getByLabel('Objetivos').fill('Objetivos');
  await dialog
    .getByRole('combobox', { name: 'Modelo de artigo (opcional)' })
    .selectOption({ label: name });
  await dialog.getByRole('button', { name: 'Criar evento' }).click();
  await expect(page.getByText('Evento criado.')).toBeVisible();

  // A equipe criada no evento recebe o artigo com o conteúdo do modelo.
  const prof = await ApiSession.login(scenario.professor.email, PASSWORD);
  const event = (await prof.get<{ id: string; title: string }[]>('/events?pageSize=100')).find(
    (item) => item.title === title,
  )!;
  await prof.post(`/events/${event.id}/advisors/${scenario.professor.id}`);
  const team = await prof.post<{ id: string }>(`/events/${event.id}/teams`, {
    identification: 'Equipe Semente',
  });
  const [article] = await prof.get<{ id: string }[]>(`/articles?teamId=${team.id}`);
  const full = await prof.get<{ content: unknown }>(`/articles/${article!.id}`);
  expect(JSON.stringify(full.content)).toContain('Semente do curso');
});
