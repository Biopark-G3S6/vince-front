import { beforeEach, describe, expect, it } from 'vitest';

import {
  canReadArticle,
  createArticle,
  createEvent,
  createTeam,
  listArticles,
  listEvents,
  type CreateEventInput,
} from './registryApi';

const ADMIN = 'user-admin';
const COORDINATOR = 'user-ricardo';
const PROFESSOR = 'user-almeida';
const STUDENT = 'user-joao';
const STORAGE_KEY = 'vinceart.mock.v1.registry';

async function newEvent(actorId = COORDINATOR, input: Partial<CreateEventInput> = {}) {
  const name = `Evento ${Math.random()}`;
  await createEvent(actorId, {
    courseId: 'course-adm',
    name,
    scope: actorId === PROFESSOR ? 'class' : 'course',
    templateId: 'standard-article',
    ...input,
  });
  return (await listEvents(actorId)).find((event) => event.name === (input.name ?? name))!;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('eventos oficiais e produções de professor', () => {
  it('professor cria atividade ou TCC sem coordenação nem monitoramento administrativo', async () => {
    for (const kind of ['practice', 'tcc'] as const) {
      const event = await newEvent(PROFESSOR, { kind, courseId: null, registrationOpen: true });
      expect(event).toMatchObject({ kind, createdById: PROFESSOR, registrationOpen: true });
      expect((await listEvents(STUDENT)).some((candidate) => candidate.id === event.id)).toBe(true);
      for (const actorId of [ADMIN, COORDINATOR])
        expect((await listEvents(actorId)).some((candidate) => candidate.id === event.id)).toBe(
          false,
        );
    }
    await expect(newEvent(PROFESSOR, { kind: 'official' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(newEvent(COORDINATOR, { kind: 'practice' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('respeita escopo e disponibilidade de modelos legados', async () => {
    await expect(newEvent(PROFESSOR, { templateId: 'academic' })).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
    await expect(newEvent(PROFESSOR, { scope: 'course' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(await newEvent(COORDINATOR, { templateId: null })).toMatchObject({
      templateId: null,
      templateVersion: null,
    });
  });
});

describe('criação de artigos', () => {
  it('permite a todos criar produção independente com o conteúdo selecionado', async () => {
    for (const actorId of [ADMIN, COORDINATOR, PROFESSOR, STUDENT]) {
      const article = await createArticle(actorId, {
        title: `Artigo ${actorId}`,
        templateId: 'standard-abstract',
      });
      expect(article).toMatchObject({
        eventId: '',
        event: 'Produção independente',
        ownerId: actorId,
        templateId: 'standard-abstract',
        templateVersion: 1,
        members: [{ id: actorId }],
      });
      expect(article.members).toHaveLength(1);
      expect(article.milestones).toHaveLength(3);
      expect(JSON.stringify(article.initialContent)).toContain('Palavras-chave');
      if (actorId !== STUDENT) expect(article.advisor.id).toBe(actorId);
    }
  });

  it('isola produção privada de professor de alunos e gestão', async () => {
    const independent = await createArticle(PROFESSOR, {
      title: 'Pesquisa pessoal',
      templateId: null,
    });
    const privateEvent = await newEvent(PROFESSOR, { kind: 'tcc' });
    const tcc = await createArticle(PROFESSOR, {
      title: 'Experimento TCC',
      templateId: null,
      eventId: privateEvent.id,
    });
    for (const article of [independent, tcc]) {
      expect(canReadArticle(PROFESSOR, article)).toBe(true);
      for (const actorId of [STUDENT, COORDINATOR, ADMIN])
        expect(canReadArticle(actorId, article)).toBe(false);
      expect(article.members.map((member) => member.id)).toEqual([PROFESSOR]);
    }
    const own = await createArticle(COORDINATOR, {
      title: 'Pesquisa da coordenação',
      templateId: null,
    });
    expect(canReadArticle(COORDINATOR, own)).toBe(true);
    expect(canReadArticle(PROFESSOR, own)).toBe(false);
    expect(canReadArticle(COORDINATOR, (await listArticles())[0]!)).toBe(true);
  });

  it('preserva criação de equipe com alunos escolhidos e versão congelada do evento', async () => {
    const article = await createTeam(PROFESSOR, {
      eventId: 'event-congress',
      memberIds: [STUDENT],
      teamName: 'Equipe B',
      title: 'Artigo B',
    });
    expect(article.templateVersion).toBe(1);
    expect(JSON.stringify(article.initialContent)).not.toContain('Resumo');
    expect(article.members.map((member) => member.id)).toEqual([STUDENT]);
  });
});

describe('migração de dados persistidos', () => {
  it('importa eventos realmente persistidos e mantém IDs dos avaliadores e cronograma pt-BR', async () => {
    const legacy = {
      academicEvents: [
        {
          id: 'event-custom-legacy',
          title: 'Jornada legada',
          course: 'Administração',
          scope: 'Turma',
          theme: 'Pesquisa já cadastrada',
          status: 'planning',
          advisors: ['Prof. Almeida'],
          maxTeams: 3,
          maxTeamSize: 4,
          milestones: [
            { date: '05 Nov, 2026', name: 'Entrega final', order: 2 },
            { date: '20 Ago, 2026', name: 'Resumo', order: 1 },
          ],
        },
        {
          id: 'event-finished',
          title: 'Evento encerrado',
          status: 'finished',
          scope: 'Instituição',
        },
      ],
      eventEvaluators: [
        { id: 'evaluator-legacy', eventId: 'event-custom-legacy', name: 'Avaliador preservado' },
      ],
    };
    window.localStorage.setItem('vinceart.mock.v1.academic-management', JSON.stringify(legacy));
    const events = await listEvents(COORDINATOR);
    expect(events.find((event) => event.id === 'event-custom-legacy')).toMatchObject({
      name: 'Jornada legada',
      kind: 'official',
      courseId: 'course-adm',
      scope: 'class',
      description: 'Pesquisa já cadastrada',
      createdById: COORDINATOR,
      registrationOpen: true,
      templateId: null,
      advisorIds: [PROFESSOR],
      maxTeams: 3,
      maxTeamSize: 4,
      schedule: [
        { name: 'Resumo', deadline: '2026-08-21T02:59:00.000Z' },
        { name: 'Entrega final', deadline: '2026-11-06T02:59:00.000Z' },
      ],
    });
    expect(events.find((event) => event.id === 'event-finished')).toMatchObject({
      registrationOpen: false,
      scope: 'institution',
      courseId: null,
    });
    expect(
      JSON.parse(window.localStorage.getItem('vinceart.mock.v1.academic-management')!)
        .eventEvaluators,
    ).toEqual(legacy.eventEvaluators);
    const registry = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(registry.legacyAcademicEventsMigrated).toBe(true);
    registry.events = registry.events.filter(
      (event: { id: string }) => event.id !== 'event-custom-legacy',
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    expect(
      (await listEvents(COORDINATOR)).some((event) => event.id === 'event-custom-legacy'),
    ).toBe(false);
  });

  it('não introduz os eventos de demonstração da coleção antiga que nunca foi gravada', async () => {
    expect(await listEvents(COORDINATOR)).toHaveLength(1);
    expect(window.localStorage.getItem('vinceart.mock.v1.academic-management')).toBeNull();
  });
});
