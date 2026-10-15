import { beforeEach, describe, expect, it } from 'vitest';

import { defaultFormat, sectionsContent } from '../model/templates';

import {
  changeEventTemplate,
  createEvent,
  getArticleTemplate,
  listEvents,
  listTemplates,
  saveTemplate,
  setTemplateActive,
} from './registryApi';

const ADMIN = 'user-admin';
const COORDINATOR = 'user-ricardo';
const PROFESSOR = 'user-almeida';

const draft = {
  content: sectionsContent(['1. Introdução']),
  description: '',
  format: defaultFormat,
  title: 'Template de teste',
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('manter template (RF-TPL-001)', () => {
  it('permite ao coordenador o template restrito ao seu curso e recusa os demais', async () => {
    await saveTemplate(COORDINATOR, { ...draft, courseId: 'course-adm' });

    await expect(
      saveTemplate(COORDINATOR, { ...draft, courseId: 'course-bio' }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(saveTemplate(COORDINATOR, { ...draft, courseId: null })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(
      saveTemplate(PROFESSOR, { ...draft, courseId: 'course-adm' }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('exige o nome', async () => {
    await expect(
      saveTemplate(ADMIN, { ...draft, courseId: null, title: ' ' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('gera versão nova ao alterar, sem alcançar o evento já criado', async () => {
    await saveTemplate(ADMIN, {
      ...draft,
      courseId: null,
      id: 'official',
      title: 'Modelo Oficial',
    });

    const official = (await listTemplates(ADMIN)).find((template) => template.id === 'official');

    expect(official?.versions.map((version) => version.number)).toEqual([1, 2, 3]);
    expect((await getArticleTemplate()).version).toBe(1);
  });

  it('desativar não muda o evento que congelou a versão', async () => {
    await setTemplateActive(ADMIN, 'official', false);

    expect((await getArticleTemplate()).template.id).toBe('official');
  });
});

describe('selecionar o template do evento (RF-TPL-002)', () => {
  it('não oferece a evento de um curso o template restrito a outro curso', async () => {
    await expect(
      createEvent(PROFESSOR, {
        courseId: 'course-adm',
        name: 'Mostra da turma',
        scope: 'class',
        templateId: 'academic',
      }),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('registra no evento a versão corrente do template, ou o documento em branco', async () => {
    await createEvent(PROFESSOR, {
      courseId: 'course-adm',
      name: 'Mostra da turma',
      scope: 'class',
      templateId: 'official',
    });
    await createEvent(COORDINATOR, {
      courseId: 'course-adm',
      name: 'Jornada',
      scope: 'course',
      templateId: null,
    });

    const events = await listEvents(ADMIN);

    expect(events.at(-2)).toMatchObject({ templateId: 'official', templateVersion: 2 });
    expect(events.at(-1)).toMatchObject({ templateId: null, templateVersion: null });
  });

  it('recusa a troca do template depois de criado o evento', async () => {
    await expect(changeEventTemplate(COORDINATOR, 'event-congress')).rejects.toMatchObject({
      code: 'TEMPLATE_ALREADY_FIXED',
    });
  });

  it('só deixa criar evento no escopo de que o ator é dono', async () => {
    await expect(
      createEvent(PROFESSOR, {
        courseId: 'course-adm',
        name: 'Evento do curso',
        scope: 'course',
        templateId: null,
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
