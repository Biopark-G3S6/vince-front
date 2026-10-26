import { beforeEach, describe, expect, it } from 'vitest';

import { defaultFormat, sectionsContent } from '../model/templates';

import {
  canReadArticle,
  changeEventTemplate,
  createArticle,
  createEvent,
  createTeam,
  currentArticle,
  getArticleTemplate,
  listArticles,
  listEventRegistrations,
  listEvents,
  listTemplates,
  registerForEvent,
  saveTemplate,
  setEventRegistrationOpen,
  setTemplateActive,
  type CreateEventInput,
} from './registryApi';

const ADMIN = 'user-admin';
const COORDINATOR = 'user-ricardo';
const PROFESSOR = 'user-almeida';
const STUDENT = 'user-joao';
const OTHER_STUDENT = 'user-beatriz';
const STORAGE_KEY = 'vinceart.mock.v1.registry';

const draft = {
  content: sectionsContent(['Conteúdo do modelo pessoal']),
  courseId: null,
  description: '',
  format: defaultFormat,
  title: 'Template de teste',
};

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

describe('biblioteca de modelos', () => {
  it('oferece dois padrões imutáveis a todos os perfis', async () => {
    for (const actorId of [ADMIN, COORDINATOR, PROFESSOR, STUDENT]) {
      expect(
        (await listTemplates(actorId))
          .filter((template) => template.visibility === 'standard')
          .map((template) => template.id),
      ).toEqual(['standard-article', 'standard-abstract']);
    }
    await expect(saveTemplate(ADMIN, { ...draft, id: 'standard-article' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(setTemplateActive(ADMIN, 'standard-abstract', false)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('permite modelos pessoais a todos os perfis, visíveis e editáveis apenas pelo autor', async () => {
    for (const actorId of [ADMIN, COORDINATOR, PROFESSOR, STUDENT]) {
      await saveTemplate(actorId, {
        ...draft,
        visibility: 'personal',
        title: `Pessoal ${actorId}`,
      });
    }
    const own = (await listTemplates(STUDENT)).find((template) => template.ownerId === STUDENT)!;
    expect(own).toMatchObject({ canMaintain: true, visibility: 'personal' });
    expect((await listTemplates(ADMIN)).some((template) => template.id === own.id)).toBe(false);
    await expect(
      saveTemplate(ADMIN, { ...draft, id: own.id, visibility: 'personal' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await saveTemplate(STUDENT, { ...draft, id: own.id, visibility: 'personal' });
    expect(
      (await listTemplates(STUDENT))
        .find((template) => template.id === own.id)
        ?.versions.map((version) => version.number),
    ).toEqual([1, 2]);
  });

  it('professor e aluno criam modelos pessoais por padrão', async () => {
    await saveTemplate(PROFESSOR, draft);
    await saveTemplate(STUDENT, draft);
    expect(
      (await listTemplates(PROFESSOR)).find((template) => template.ownerId === PROFESSOR),
    ).toMatchObject({ visibility: 'personal' });
    expect(
      (await listTemplates(STUDENT)).find((template) => template.ownerId === STUDENT),
    ).toMatchObject({ visibility: 'personal' });
  });

  it('preserva manutenção dos modelos institucionais legados por curso', async () => {
    await saveTemplate(COORDINATOR, { ...draft, courseId: 'course-adm' });
    await expect(
      saveTemplate(COORDINATOR, { ...draft, courseId: 'course-bio' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(saveTemplate(COORDINATOR, draft)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    await expect(
      saveTemplate(PROFESSOR, { ...draft, id: 'abnt', courseId: 'course-adm' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('exige nome e recusa falsificação de proprietário', async () => {
    await expect(saveTemplate(STUDENT, { ...draft, title: ' ' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    await expect(
      saveTemplate(STUDENT, { ...draft, visibility: 'personal', ownerId: ADMIN }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('mantém versões anteriores e o modelo congelado ao alterar ou desativar', async () => {
    await saveTemplate(ADMIN, { ...draft, id: 'official', title: 'Modelo Oficial' });
    await setTemplateActive(ADMIN, 'official', false);
    expect(
      (await listTemplates(ADMIN))
        .find((template) => template.id === 'official')
        ?.versions.map((version) => version.number),
    ).toEqual([1, 2, 3]);
    expect(await getArticleTemplate()).toMatchObject({ template: { id: 'official' }, version: 1 });
  });

  it('publica modelo só pelo responsável e oculta modelos de eventos privados', async () => {
    const event = await newEvent(PROFESSOR, { kind: 'tcc' });
    await saveTemplate(PROFESSOR, { ...draft, visibility: 'event', eventId: event.id });
    const published = (await listTemplates(PROFESSOR)).find(
      (template) => template.eventId === event.id,
    )!;
    expect(published.canMaintain).toBe(true);
    for (const actorId of [COORDINATOR, ADMIN, STUDENT]) {
      expect((await listTemplates(actorId)).some((template) => template.id === published.id)).toBe(
        false,
      );
      await expect(
        saveTemplate(actorId, { ...draft, visibility: 'event', eventId: event.id }),
      ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    }
    await setEventRegistrationOpen(PROFESSOR, { eventId: event.id, open: true });
    expect((await listTemplates(STUDENT)).some((template) => template.id === published.id)).toBe(
      true,
    );
  });
});

describe('eventos oficiais e produções de professor', () => {
  it('cria evento oficial indisponível até publicação autorizada', async () => {
    const event = await newEvent(COORDINATOR, { registrationOpen: true });
    expect(event).toMatchObject({
      createdById: COORDINATOR,
      kind: 'official',
      registrationOpen: false,
    });
    expect((await listEvents(STUDENT)).some((candidate) => candidate.id === event.id)).toBe(false);
    await expect(
      setEventRegistrationOpen(STUDENT, { eventId: event.id, open: true }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(
      setEventRegistrationOpen(PROFESSOR, { eventId: event.id, open: true }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await saveTemplate(PROFESSOR, { ...draft, visibility: 'event', eventId: event.id });
    await setEventRegistrationOpen(COORDINATOR, { eventId: event.id, open: true });
    expect((await listEvents(STUDENT)).some((candidate) => candidate.id === event.id)).toBe(true);
  });

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
    await expect(changeEventTemplate(COORDINATOR, 'event-congress')).rejects.toMatchObject({
      code: 'TEMPLATE_ALREADY_FIXED',
    });
    expect(await newEvent(COORDINATOR, { templateId: null })).toMatchObject({
      templateId: null,
      templateVersion: null,
    });
  });
});

describe('inscrição em evento', () => {
  it('é exclusiva de aluno, idempotente e persistida mesmo após encerramento', async () => {
    const event = await newEvent(COORDINATOR);
    await expect(registerForEvent(STUDENT, event.id)).rejects.toMatchObject({
      code: 'EVENT_REGISTRATION_CLOSED',
    });
    await setEventRegistrationOpen(COORDINATOR, { eventId: event.id, open: true });
    await expect(registerForEvent(PROFESSOR, event.id)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    const registration = await registerForEvent(STUDENT, event.id);
    await setEventRegistrationOpen(COORDINATOR, { eventId: event.id, open: false });
    expect(await registerForEvent(STUDENT, event.id)).toEqual(registration);
    expect(await listEventRegistrations(STUDENT)).toContainEqual(registration);
    expect(
      (await listEventRegistrations(OTHER_STUDENT)).some(
        (candidate) => candidate.eventId === event.id,
      ),
    ).toBe(false);
    expect((await listEvents(STUDENT)).some((candidate) => candidate.id === event.id)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).registrations).toContainEqual(
      registration,
    );
  });

  it('valida prazo e capacidade de equipes multiplicada por alunos por equipe', async () => {
    const expired = await newEvent(PROFESSOR, {
      registrationOpen: true,
      registrationDeadline: '2020-01-01T00:00:00.000Z',
    });
    await expect(registerForEvent(STUDENT, expired.id)).rejects.toMatchObject({
      code: 'EVENT_REGISTRATION_DEADLINE_PASSED',
    });
    await expect(
      setEventRegistrationOpen(PROFESSOR, { eventId: expired.id, open: true }),
    ).rejects.toMatchObject({ code: 'EVENT_REGISTRATION_DEADLINE_PASSED' });
    const full = await newEvent(PROFESSOR, { registrationOpen: true, maxTeams: 1, maxTeamSize: 1 });
    await registerForEvent(STUDENT, full.id);
    await expect(registerForEvent(OTHER_STUDENT, full.id)).rejects.toMatchObject({
      code: 'EVENT_REGISTRATION_LIMIT_REACHED',
    });
    await expect(newEvent(PROFESSOR, { maxTeamSize: 0 })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
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

  it('mantém versão pessoal e conteúdo congelados no artigo e recusa uso por terceiro', async () => {
    await saveTemplate(STUDENT, draft);
    const template = (await listTemplates(STUDENT)).find(
      (candidate) => candidate.visibility === 'personal',
    )!;
    const article = await createArticle(STUDENT, { title: 'Meu artigo', templateId: template.id });
    await saveTemplate(STUDENT, {
      ...draft,
      id: template.id,
      content: sectionsContent(['Versão seguinte']),
    });
    window.sessionStorage.setItem('vinceart.article', article.id);
    expect(currentArticle.ownerId).toBe(STUDENT);
    expect(currentArticle.templateId).toBe(template.id);
    expect(currentArticle.templateVersion).toBe(1);
    expect(currentArticle.initialContent).toEqual(draft.content);
    expect(await getArticleTemplate()).toMatchObject({ template: { id: template.id }, version: 1 });
    await expect(
      createArticle(OTHER_STUDENT, { title: 'Cópia indevida', templateId: template.id }),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('congela formatação por versão sem impedir a atualização do catálogo', async () => {
    await saveTemplate(STUDENT, { ...draft, format: { ...defaultFormat, fontSize: 12 } });
    const template = (await listTemplates(STUDENT)).find(
      (candidate) => candidate.visibility === 'personal',
    )!;
    const first = await createArticle(STUDENT, { title: 'Versão antiga', templateId: template.id });
    await saveTemplate(STUDENT, {
      ...draft,
      id: template.id,
      format: { ...defaultFormat, fontSize: 16 },
    });
    window.sessionStorage.setItem('vinceart.article', first.id);
    expect(await getArticleTemplate()).toMatchObject({
      template: { id: template.id, fontSize: 12 },
      version: 1,
    });
    expect(
      (await listTemplates(STUDENT)).find((candidate) => candidate.id === template.id)?.fontSize,
    ).toBe(16);
    const second = await createArticle(STUDENT, { title: 'Versão atual', templateId: template.id });
    window.sessionStorage.setItem('vinceart.article', second.id);
    expect(await getArticleTemplate()).toMatchObject({
      template: { id: template.id, fontSize: 16 },
      version: 2,
    });
  });

  it('requer inscrição e permite escolher o modelo publicado do evento', async () => {
    const event = await newEvent(PROFESSOR, { registrationOpen: true });
    await saveTemplate(PROFESSOR, { ...draft, visibility: 'event', eventId: event.id });
    const template = (await listTemplates(PROFESSOR)).find(
      (candidate) => candidate.eventId === event.id,
    )!;
    await expect(
      createArticle(STUDENT, { title: 'Trabalho', templateId: template.id, eventId: event.id }),
    ).rejects.toMatchObject({ code: 'EVENT_REGISTRATION_REQUIRED' });
    await registerForEvent(STUDENT, event.id);
    const article = await createArticle(STUDENT, {
      title: 'Trabalho',
      templateId: template.id,
      eventId: event.id,
    });
    expect(article).toMatchObject({
      eventId: event.id,
      templateId: template.id,
      initialContent: draft.content,
      ownerId: STUDENT,
    });
    window.sessionStorage.setItem('vinceart.article', article.id);
    expect(await getArticleTemplate()).toMatchObject({ template: { id: template.id }, version: 1 });
    const independent = await createArticle(STUDENT, { title: 'Em branco', templateId: null });
    expect(independent.initialContent).toBeNull();
    window.sessionStorage.setItem('vinceart.article', independent.id);
    expect(await getArticleTemplate()).toMatchObject({ template: { id: 'blank' }, version: null });
  });

  it('usa apenas a versão pessoal congelada no evento, sem expor atualizações privadas', async () => {
    await saveTemplate(COORDINATOR, { ...draft, visibility: 'personal' });
    const template = (await listTemplates(COORDINATOR)).find(
      (candidate) => candidate.visibility === 'personal',
    )!;
    const event = await newEvent(COORDINATOR, { templateId: template.id });
    await saveTemplate(COORDINATOR, {
      ...draft,
      id: template.id,
      visibility: 'personal',
      content: sectionsContent(['Novo conteúdo privado']),
      format: { ...defaultFormat, fontSize: 18 },
    });
    expect((await listTemplates(STUDENT)).some((candidate) => candidate.id === template.id)).toBe(
      false,
    );
    await setEventRegistrationOpen(COORDINATOR, { eventId: event.id, open: true });
    const shared = (await listTemplates(STUDENT)).find(
      (candidate) => candidate.id === template.id,
    )!;
    expect(shared.versions.map((version) => version.number)).toEqual([1]);
    expect(shared.fontSize).toBe(12);
    expect(shared.canMaintain).toBe(false);
    await registerForEvent(STUDENT, event.id);
    const article = await createArticle(STUDENT, {
      title: 'Artigo do evento',
      templateId: template.id,
      eventId: event.id,
    });
    expect(article).toMatchObject({ templateVersion: 1, initialContent: draft.content });
    await expect(
      createArticle(STUDENT, { title: 'Fora do evento', templateId: template.id }),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    await expect(newEvent(PROFESSOR, { templateId: template.id })).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
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

  it('acrescenta padrões, campos e inscrições sem apagar versões e trabalhos existentes', async () => {
    await saveTemplate(ADMIN, { ...draft, id: 'official' });
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    stored.templates = stored.templates.filter(
      (template: { visibility?: string }) => template.visibility !== 'standard',
    );
    delete stored.registrations;
    for (const event of stored.events) {
      delete event.kind;
      delete event.createdById;
      delete event.registrationOpen;
      delete event.description;
      delete event.registrationDeadline;
      delete event.maxTeamSize;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const templates = await listTemplates(STUDENT);
    expect(templates.find((template) => template.id === 'official')?.versions).toHaveLength(3);
    expect(templates.filter((template) => template.visibility === 'standard')).toHaveLength(2);
    expect(await listEvents(COORDINATOR)).toEqual([
      expect.objectContaining({
        id: 'event-congress',
        kind: 'official',
        createdById: COORDINATOR,
        registrationOpen: true,
        maxTeamSize: 6,
      }),
    ]);
    expect(await listArticles()).toHaveLength(1);
    expect(await listEventRegistrations(STUDENT)).toEqual([
      expect.objectContaining({ eventId: 'event-congress', studentId: STUDENT }),
    ]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).templates).toHaveLength(5);
    await listTemplates(STUDENT);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).templates).toHaveLength(5);
  });
});
