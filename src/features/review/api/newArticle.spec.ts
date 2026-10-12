import { beforeEach, describe, expect, it } from 'vitest';

import { createEvent, createTeam, currentArticle, listArticles } from '@features/articles';

import { deliverMilestone, getReviewCycle, readCycleOf, saveDraft } from './reviewApi';

const PROFESSOR = 'user-almeida';
const STUDENT = 'user-joao';

const team = {
  eventId: 'event-congress',
  memberIds: [STUDENT, 'user-beatriz'],
  teamName: 'Equipe Ômega',
  title: 'Gestão de dados abertos',
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('criar equipe no evento (RF-EQP-001)', () => {
  it('cria o artigo da equipe em STARTED, com o cronograma do evento', async () => {
    const article = await createTeam(PROFESSOR, team);
    const cycle = readCycleOf(article.id);

    expect(await listArticles()).toHaveLength(2);
    expect(cycle).toMatchObject({ draft: [], remarks: [], status: 'STARTED', submissions: [] });
    expect(cycle.milestones.map((milestone) => milestone.name)).toEqual([
      'Projeto de pesquisa',
      'Referencial teórico',
      'Versão final',
    ]);
  });

  it('nasce com o conteúdo da versão do template que o evento congelou', async () => {
    const article = await createTeam(PROFESSOR, team);
    const headings = (article.initialContent?.content ?? [])
      .filter((node) => node.type === 'heading')
      .map((node) => node.content?.[0]?.text);

    // O Congresso 2026 congelou a versão 1, anterior à inclusão de Resumo e Abstract.
    expect(headings[0]).toBe('1. Introdução');
  });

  it('nasce vazio quando o evento optou por documento em branco', async () => {
    await createEvent('user-ricardo', {
      courseId: 'course-adm',
      name: 'Jornada',
      scope: 'course',
      templateId: null,
    });
    const event = (await import('@features/articles')).listEvents;
    const created = (await event('user-ricardo')).at(-1)!;
    const article = await createTeam(PROFESSOR, { ...team, eventId: created.id });

    expect(article.initialContent).toBeNull();
  });

  it('só o orientador do evento cria equipe, e dentro do limite do evento', async () => {
    await expect(createTeam('user-ricardo', team)).rejects.toMatchObject({
      code: 'ADVISOR_NOT_ASSIGNED_TO_EVENT',
    });

    for (const name of ['B', 'C', 'D']) {
      await createTeam(PROFESSOR, { ...team, teamName: `Equipe ${name}` });
    }

    await expect(createTeam(PROFESSOR, team)).rejects.toMatchObject({
      code: 'EVENT_TEAM_LIMIT_REACHED',
    });
  });

  it('cada artigo tem o seu ciclo: editar o novo não altera o de outra equipe', async () => {
    const article = await createTeam(PROFESSOR, team);

    window.sessionStorage.setItem('vinceart.article', article.id);
    expect(currentArticle.title).toBe('Gestão de dados abertos');

    await saveDraft(STUDENT, [{ id: 'p1', text: 'Primeiro parágrafo.' }]);
    expect((await getReviewCycle(STUDENT)).status).toBe('IN_PROGRESS');
    await deliverMilestone(STUDENT);
    expect(readCycleOf(article.id).status).toBe('IN_REVIEW');
    expect(readCycleOf('article-neural').status).toBe('IN_PROGRESS');
  });
});
