import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createArticle, createEvent, listEvents } from '@features/articles';
import { generateReport, listAdvisorTeams, listCourseEvents } from '@features/progress';

import { getEditorState, loadDocument, persistDocument } from './editorApi';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-26T15:00:00Z'));
});

afterEach(() => vi.useRealTimers());

describe('produção a partir da biblioteca de modelos', () => {
  for (const actor of ['user-joao', 'user-almeida', 'user-ricardo']) {
    it(`permite que ${actor} edite e preserve seu próprio artigo`, async () => {
      const article = await createArticle(actor, {
        templateId: 'standard-abstract',
        title: 'Minha pesquisa independente',
      });
      window.sessionStorage.setItem('vinceart.article', article.id);

      expect((await getEditorState(actor)).editable).toBe(true);
      expect(JSON.stringify((await loadDocument(actor)).seed)).toContain('Palavras-chave');

      const snapshot = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Conteúdo preservado.' }] }],
      };
      await persistDocument(actor, { snapshot, ydoc: '' });
      expect((await loadDocument(actor)).seed).toEqual(snapshot);
    });
  }

  it('mantém TCC e artigo do professor fora do editor e dos relatórios da coordenação', async () => {
    const before = await generateReport('user-ricardo', 'course-adm', '2026.2');
    await createEvent('user-almeida', {
      courseId: 'course-adm',
      kind: 'tcc',
      name: 'TCC independente do professor',
      scope: 'class',
      templateId: 'standard-article',
    });
    const event = (await listEvents('user-almeida')).at(-1)!;
    const article = await createArticle('user-almeida', {
      eventId: event.id,
      templateId: 'standard-article',
      title: 'Artigo privado de TCC',
    });
    window.sessionStorage.setItem('vinceart.article', article.id);

    await expect(getEditorState('user-ricardo')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
    await expect(loadDocument('user-admin')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    expect(
      (await listAdvisorTeams('user-almeida')).some((team) => team.articleTitle === article.title),
    ).toBe(true);
    expect((await listCourseEvents('user-ricardo')).some((entry) => entry.id === event.id)).toBe(
      false,
    );
    const after = await generateReport('user-ricardo', 'course-adm', '2026.2');
    expect(after.notConcluded).toBe(before.notConcluded);
    expect(after.students).toBe(before.students);
  });
});
