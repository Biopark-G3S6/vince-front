import type { JSONContent } from '@tiptap/core';

import { ApiError } from '@shared/api/apiError';
import { createId, createMockCollection, respond } from '@shared/api/mockDb';

import {
  blankTemplate,
  courses,
  currentVersion,
  defaultFormat,
  isAvailableTo,
  sectionsContent,
  type ArticleTemplate,
  type EventScope,
  type EventTemplate,
  type StoredTemplate,
  type TemplateFormat,
} from '../model/templates';
import {
  advisors,
  DEMO_ARTICLE_ID,
  students,
  type Article,
  type TeamMember,
} from '../model/article';

/**
 * Backend simulado do cadastro acadêmico de que o artigo depende: templates
 * (RF-TPL-001, RF-TPL-002), eventos e equipes com os seus artigos (RF-EQP-001).
 */

export type EventRegistration = {
  id: string;
  eventId: string;
  studentId: string;
  createdAt: string;
};

type RegistryDb = {
  legacyAcademicEventsMigrated?: boolean;
  articles: Article[];
  events: EventTemplate[];
  templates: StoredTemplate[];
  registrations: EventRegistration[];
};

const ADMIN_ID = 'user-admin';
const COORDINATOR_ID = 'user-ricardo';
const PROFESSOR_ID = 'user-almeida';
/** Curso que o coordenador coordena e a que pertencem as turmas do professor. */
const OWN_COURSE = 'course-adm';
/** Evento do artigo de demonstração. */
const ARTICLE_EVENT = 'event-congress';

const names: Record<string, string> = {
  [ADMIN_ID]: 'Admin Geral',
  [COORDINATOR_ID]: 'Dr. Ricardo Santos',
  [PROFESSOR_ID]: 'Prof. Almeida',
  ...Object.fromEntries(students.map((student) => [student.id, student.name])),
};

const baseSections = [
  'Resumo',
  'Abstract',
  '1. Introdução',
  '2. Referencial teórico',
  '3. Metodologia',
  '4. Resultados',
  '5. Conclusão',
];

const congressSchedule = [
  { deadline: '2026-09-16T02:59:00.000Z', name: 'Projeto de pesquisa' },
  { deadline: '2026-10-21T02:59:00.000Z', name: 'Referencial teórico' },
  { deadline: '2026-11-06T02:59:00.000Z', name: 'Versão final' },
];

function toMilestones(schedule: EventTemplate['schedule']) {
  return schedule.map((step, index) => ({
    deadline: step.deadline,
    id: `milestone-${index + 1}`,
    name: step.name,
    order: index + 1,
  }));
}

const rawDb = createMockCollection<RegistryDb>('registry', () => ({
  registrations: [],
  articles: [
    {
      advisor: advisors[0]!,
      createdAt: '2026-08-20T13:00:00.000Z',
      event: 'Congresso 2026',
      eventId: ARTICLE_EVENT,
      id: DEMO_ARTICLE_ID,
      initialContent: null,
      members: students.slice(0, 3),
      milestones: toMilestones(congressSchedule),
      team: 'Equipe Alpha',
      title: 'Análise de Redes Neurais em Saúde',
    },
  ],
  events: [
    {
      courseId: OWN_COURSE,
      createdBy: names[COORDINATOR_ID]!,
      id: ARTICLE_EVENT,
      name: 'Congresso 2026',
      scope: 'course',
      templateId: 'official',
      templateTitle: 'Modelo Oficial — Faculdade Regional de Tecnologia',
      // O template já está na versão 2; o evento permanece na que congelou.
      templateVersion: 1,
      advisorIds: [PROFESSOR_ID],
      maxTeams: 4,
      schedule: congressSchedule,
    },
  ],
  templates: [
    {
      ...defaultFormat,
      active: true,
      courseId: null,
      description: 'Modelo disponibilizado pela instituição para trabalhos acadêmicos.',
      id: 'official',
      label: 'Modelo oficial — Faculdade Regional de Tecnologia',
      preview: 'official',
      recommended: true,
      title: 'Modelo Oficial — Faculdade Regional de Tecnologia',
      versions: [
        {
          content: sectionsContent(baseSections.slice(2)),
          createdAt: '2026-02-10T13:00:00.000Z',
          createdBy: names[ADMIN_ID]!,
          number: 1,
        },
        {
          content: sectionsContent(baseSections),
          createdAt: '2026-08-04T13:00:00.000Z',
          createdBy: names[ADMIN_ID]!,
          number: 2,
        },
      ],
    },
    {
      ...defaultFormat,
      active: true,
      courseId: OWN_COURSE,
      description: 'Modelo do congresso interno do curso, baseado nas normas ABNT.',
      fontFamily: '"Times New Roman", Times, serif',
      id: 'abnt',
      label: 'Congresso interno — Administração',
      preview: 'abnt',
      title: 'Congresso Interno de Administração',
      versions: [
        {
          content: sectionsContent(baseSections),
          createdAt: '2026-03-02T13:00:00.000Z',
          createdBy: names[COORDINATOR_ID]!,
          number: 1,
        },
      ],
    },
    {
      ...defaultFormat,
      active: true,
      courseId: 'course-bio',
      description: 'Modelo de relatório de pesquisa do curso de Ciências Biológicas.',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      id: 'academic',
      label: 'Relatório de pesquisa — Ciências Biológicas',
      lineHeight: 1.6,
      preview: 'academic',
      textAlign: 'left',
      title: 'Relatório de Pesquisa em Biotecnologia',
      versions: [
        {
          content: sectionsContent(['Resumo', '1. Introdução', '2. Materiais e métodos']),
          createdAt: '2026-03-20T13:00:00.000Z',
          createdBy: names[ADMIN_ID]!,
          number: 1,
        },
      ],
    },
  ],
}));

const DAY = 86_400_000;
const DEFAULT_MAX_TEAMS = 10;
const DEFAULT_MAX_TEAM_SIZE = 6;

type LegacyAcademicEvent = {
  id: string;
  title: string;
  course?: string;
  scope?: string;
  theme?: string;
  status?: string;
  advisors?: string[];
  maxTeams?: number;
  maxTeamSize?: number;
  milestones?: Array<{ date: string; name: string; order?: number }>;
};

function plainText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

/** As datas da tela antiga usam o calendário brasileiro, com prazo no fim do dia. */
function legacyDeadline(value: string): string | null {
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoDay) {
    return new Date(
      Date.UTC(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]) + 1, 2, 59),
    ).toISOString();
  }
  const date = /^(\d{1,2})\s+([a-zç.]+),?\s+(\d{4})$/i.exec(value.trim());
  if (date) {
    const month = [
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ].indexOf(plainText(date[2]!).slice(0, 3));
    if (month < 0) return null;
    return new Date(Date.UTC(Number(date[3]), month, Number(date[1]) + 1, 2, 59)).toISOString();
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

/** Importa somente a coleção antiga que foi gravada neste navegador, uma única vez. */
function migrateLegacyAcademicEvents(registry: RegistryDb) {
  if (registry.legacyAcademicEventsMigrated) return;
  registry.legacyAcademicEventsMigrated = true;
  const stored = window.localStorage.getItem('vinceart.mock.v1.academic-management');
  if (!stored) return;
  let legacy: { academicEvents?: LegacyAcademicEvent[] };
  try {
    legacy = JSON.parse(stored) as typeof legacy;
  } catch {
    return;
  }
  if (!legacy || !Array.isArray(legacy.academicEvents)) return;
  for (const event of legacy.academicEvents) {
    if (
      !event ||
      typeof event.id !== 'string' ||
      typeof event.title !== 'string' ||
      !event.title.trim() ||
      registry.events.some((candidate) => candidate.id === event.id)
    )
      continue;
    const scope = typeof event.scope === 'string' ? plainText(event.scope) : '';
    const course = courses.find(
      (candidate) =>
        typeof event.course === 'string' && plainText(candidate.name) === plainText(event.course),
    );
    const schedule = (Array.isArray(event.milestones) ? event.milestones : [])
      .filter((step) => step && typeof step.name === 'string' && typeof step.date === 'string')
      .sort((first, second) => (first.order ?? 0) - (second.order ?? 0))
      .flatMap((step) => {
        const deadline = legacyDeadline(step.date);
        return deadline ? [{ name: step.name, deadline }] : [];
      });
    registry.events.push({
      id: event.id,
      name: event.title.trim(),
      description: typeof event.theme === 'string' ? event.theme : '',
      kind: 'official',
      createdBy: names[COORDINATOR_ID]!,
      createdById: COORDINATOR_ID,
      scope: scope === 'instituicao' ? 'institution' : scope === 'turma' ? 'class' : 'course',
      courseId: scope === 'instituicao' ? null : (course?.id ?? null),
      templateId: null,
      templateTitle: blankTemplate.title,
      templateVersion: null,
      advisorIds: advisors
        .filter((advisor) => Array.isArray(event.advisors) && event.advisors.includes(advisor.name))
        .map((advisor) => advisor.id),
      maxTeams:
        Number.isInteger(event.maxTeams) && event.maxTeams! > 0
          ? event.maxTeams!
          : DEFAULT_MAX_TEAMS,
      maxTeamSize:
        Number.isInteger(event.maxTeamSize) && event.maxTeamSize! > 0
          ? event.maxTeamSize!
          : DEFAULT_MAX_TEAM_SIZE,
      registrationOpen: event.status === 'running' || event.status === 'planning',
      registrationDeadline: null,
      schedule: schedule.length ? schedule : defaultSchedule(),
    });
  }
}

function standardTemplates(): StoredTemplate[] {
  return [
    { id: 'standard-article', title: 'Artigo científico', sections: baseSections },
    {
      id: 'standard-abstract',
      title: 'Resumo expandido',
      sections: [
        'Título',
        'Resumo',
        'Palavras-chave',
        'Introdução',
        'Metodologia',
        'Resultados',
        'Conclusão',
        'Referências',
      ],
    },
  ].map(({ id, title, sections }) => ({
    ...defaultFormat,
    active: true,
    courseId: null,
    description: `Modelo padrão para ${title.toLocaleLowerCase()}.`,
    id,
    label: title,
    preview: 'official',
    title,
    visibility: 'standard',
    versions: [
      {
        content: sectionsContent(sections),
        format: { ...defaultFormat },
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'VinceArt',
        number: 1,
      },
    ],
  }));
}

/** Completa registros anteriores sem substituir versões, eventos ou artigos salvos. */
function normalizeRegistry(value: RegistryDb): RegistryDb {
  value.registrations ??= [];
  migrateLegacyAcademicEvents(value);
  for (const standard of standardTemplates()) {
    if (!value.templates.some((template) => template.id === standard.id)) {
      value.templates.push(standard);
    }
  }
  for (const event of value.events) {
    event.kind ??= 'official';
    event.createdById ??=
      Object.keys(names).find((id) => names[id] === event.createdBy) ?? COORDINATOR_ID;
    event.description ??= '';
    // Eventos anteriores à publicação explícita já estavam disponíveis.
    event.registrationOpen ??= true;
    event.registrationDeadline ??= null;
    event.maxTeamSize ??= DEFAULT_MAX_TEAM_SIZE;
    event.advisorIds ??= [PROFESSOR_ID];
    event.maxTeams ??= DEFAULT_MAX_TEAMS;
    event.schedule ??= defaultSchedule();
  }
  for (const article of value.articles) {
    for (const member of article.members) {
      if (
        article.eventId &&
        isStudent(member.id) &&
        !value.registrations.some(
          (registration) =>
            registration.eventId === article.eventId && registration.studentId === member.id,
        )
      ) {
        value.registrations.push({
          id: `registration-${article.eventId}-${member.id}`,
          eventId: article.eventId,
          studentId: member.id,
          createdAt: article.createdAt,
        });
      }
    }
  }
  return value;
}

const db = {
  read() {
    const value = rawDb.read();
    const before = JSON.stringify(value);
    normalizeRegistry(value);
    if (JSON.stringify(value) !== before) {
      rawDb.update((draft) => Object.assign(draft, value));
    }
    return value;
  },
  update(mutate: (draft: RegistryDb) => void) {
    return rawDb.update((draft) => mutate(normalizeRegistry(draft)));
  },
};

function isStudent(actorId: string) {
  return students.some((student) => student.id === actorId);
}

function assertCreator(actorId: string) {
  if (!names[actorId]) throw new ApiError('PERMISSION_DENIED');
}

function canMaintainLegacy(actorId: string, courseId: string | null) {
  return actorId === ADMIN_ID || (actorId === COORDINATOR_ID && courseId === OWN_COURSE);
}

function canManageEvent(actorId: string, event: EventTemplate) {
  if (actorId === PROFESSOR_ID) {
    return event.createdById === actorId || event.advisorIds.includes(actorId);
  }
  return (
    event.kind === 'official' &&
    (actorId === ADMIN_ID ||
      (actorId === COORDINATOR_ID &&
        (event.courseId === OWN_COURSE || event.createdById === actorId)))
  );
}

function canViewEvent(actorId: string, event: EventTemplate, registry: RegistryDb) {
  if (actorId === ADMIN_ID || actorId === COORDINATOR_ID) return event.kind === 'official';
  if (actorId === PROFESSOR_ID) return event.kind === 'official' || event.createdById === actorId;
  return (
    isStudent(actorId) &&
    (event.registrationOpen === true ||
      registry.registrations.some(
        (registration) => registration.eventId === event.id && registration.studentId === actorId,
      ) ||
      registry.articles.some(
        (article) =>
          article.eventId === event.id && article.members.some((member) => member.id === actorId),
      ))
  );
}

function canMaintainTemplate(actorId: string, template: StoredTemplate, registry: RegistryDb) {
  if (template.visibility === 'standard') return false;
  if (template.visibility === 'personal') return template.ownerId === actorId;
  if (template.visibility === 'event') {
    const event = registry.events.find((candidate) => candidate.id === template.eventId);
    return !!event && canManageEvent(actorId, event);
  }
  return canMaintainLegacy(actorId, template.courseId);
}

function canViewTemplate(actorId: string, template: StoredTemplate, registry: RegistryDb) {
  if (template.visibility === 'personal') {
    return (
      template.ownerId === actorId ||
      registry.events.some(
        (event) => event.templateId === template.id && canViewEvent(actorId, event, registry),
      )
    );
  }
  if (template.visibility === 'event') {
    const event = registry.events.find((candidate) => candidate.id === template.eventId);
    return !!event && canViewEvent(actorId, event, registry);
  }
  return true;
}

export function listTemplates(actorId: string) {
  return respond(() => {
    assertCreator(actorId);
    const registry = db.read();
    return registry.templates
      .filter((template) => canViewTemplate(actorId, template, registry))
      .map((template) => {
        const versions =
          template.visibility === 'personal' && template.ownerId !== actorId
            ? template.versions.filter((version) =>
                registry.events.some(
                  (event) =>
                    event.templateId === template.id &&
                    event.templateVersion === version.number &&
                    canViewEvent(actorId, event, registry),
                ),
              )
            : template.versions;
        return {
          ...template,
          ...(template.visibility === 'personal' && template.ownerId !== actorId
            ? versions.at(-1)?.format
            : undefined),
          versions,
          canMaintain: canMaintainTemplate(actorId, template, registry),
        };
      });
  });
}

export type SaveTemplateInput = {
  content: JSONContent;
  courseId: string | null;
  description: string;
  format: TemplateFormat;
  id?: string;
  title: string;
  ownerId?: string;
  visibility?: StoredTemplate['visibility'];
  eventId?: string;
};

/** Uma alteração cria versão nova; modelos pessoais pertencem ao autor. */
export function saveTemplate(actorId: string, input: SaveTemplateInput) {
  return respond(() => {
    assertCreator(actorId);
    if (!input.title.trim()) throw new ApiError('VALIDATION_FAILED');
    db.update((draft) => {
      const existing = draft.templates.find((template) => template.id === input.id);
      if (input.id && !existing) throw new ApiError('RESOURCE_NOT_FOUND');
      if (existing && !canMaintainTemplate(actorId, existing, draft))
        throw new ApiError('PERMISSION_DENIED');
      const visibility =
        input.visibility ??
        existing?.visibility ??
        (actorId === PROFESSOR_ID || isStudent(actorId) ? 'personal' : undefined);
      const eventId = visibility === 'event' ? (input.eventId ?? existing?.eventId) : undefined;
      if (visibility === 'standard') throw new ApiError('PERMISSION_DENIED');
      if (visibility === 'event') {
        const event = draft.events.find((candidate) => candidate.id === eventId);
        if (!event) throw new ApiError('RESOURCE_NOT_FOUND');
        if (!canManageEvent(actorId, event)) throw new ApiError('PERMISSION_DENIED');
      } else if (visibility === 'personal') {
        if (
          (existing?.ownerId && existing.ownerId !== actorId) ||
          (input.ownerId && input.ownerId !== actorId)
        )
          throw new ApiError('PERMISSION_DENIED');
      } else if (!canMaintainLegacy(actorId, input.courseId)) {
        throw new ApiError('PERMISSION_DENIED');
      }
      const version = {
        content: input.content,
        format: { ...input.format },
        createdAt: new Date().toISOString(),
        createdBy: names[actorId]!,
        number: existing ? currentVersion(existing).number + 1 : 1,
      };
      const fields = {
        ...input.format,
        courseId: visibility === 'personal' ? null : input.courseId,
        description: input.description.trim(),
        label: input.title.trim(),
        title: input.title.trim(),
        visibility,
        eventId,
        ownerId: existing?.ownerId ?? actorId,
      };
      if (existing) {
        const previousFormat = {
          fontFamily: existing.fontFamily,
          fontSize: existing.fontSize,
          lineHeight: existing.lineHeight,
          textAlign: existing.textAlign,
        };
        existing.versions.forEach((previous) => {
          previous.format ??= { ...previousFormat };
        });
        Object.assign(existing, fields);
        existing.versions.push(version);
      } else {
        draft.templates.push({
          ...fields,
          active: true,
          id: createId('template'),
          preview: 'official',
          versions: [version],
        });
      }
    });
  });
}

export function setTemplateActive(actorId: string, templateId: string, active: boolean) {
  return respond(() => {
    assertCreator(actorId);
    db.update((draft) => {
      const template = draft.templates.find((candidate) => candidate.id === templateId);
      if (!template) throw new ApiError('RESOURCE_NOT_FOUND');
      if (!canMaintainTemplate(actorId, template, draft)) throw new ApiError('PERMISSION_DENIED');
      template.active = active;
    });
  });
}

export function listEvents(actorId: string) {
  return respond(() => {
    assertCreator(actorId);
    const registry = db.read();
    return registry.events
      .filter((event) => canViewEvent(actorId, event, registry))
      .map((event) => ({ ...event, canManage: canManageEvent(actorId, event) }));
  });
}

export function allowedScopes(actorId: string): EventScope[] {
  if (actorId === ADMIN_ID) return ['institution', 'course'];
  if (actorId === COORDINATOR_ID) return ['course', 'class'];
  if (actorId === PROFESSOR_ID) return ['class'];
  return [];
}

export type CreateEventInput = {
  courseId: string | null;
  name: string;
  scope: EventScope;
  templateId: string | null;
  kind?: EventTemplate['kind'];
  description?: string;
  registrationOpen?: boolean;
  registrationDeadline?: string | null;
  maxTeams?: number;
  maxTeamSize?: number;
  schedule?: EventTemplate['schedule'];
  advisorIds?: string[];
};

export function createEvent(actorId: string, input: CreateEventInput) {
  return respond(() => {
    assertCreator(actorId);
    const kind = input.kind ?? (actorId === PROFESSOR_ID ? 'practice' : 'official');
    const courseId = input.scope === 'institution' ? null : input.courseId;
    if (
      !input.name.trim() ||
      (input.maxTeams !== undefined && (!Number.isInteger(input.maxTeams) || input.maxTeams < 1)) ||
      (input.maxTeamSize !== undefined &&
        (!Number.isInteger(input.maxTeamSize) || input.maxTeamSize < 1)) ||
      (input.registrationDeadline && Number.isNaN(Date.parse(input.registrationDeadline))) ||
      input.schedule?.some((step) => !step.name.trim() || Number.isNaN(Date.parse(step.deadline)))
    )
      throw new ApiError('VALIDATION_FAILED');
    const ownsScope =
      allowedScopes(actorId).includes(input.scope) &&
      (actorId === ADMIN_ID || actorId === PROFESSOR_ID || courseId === OWN_COURSE);
    if (!ownsScope || (actorId === PROFESSOR_ID ? kind === 'official' : kind !== 'official'))
      throw new ApiError('PERMISSION_DENIED');
    db.update((draft) => {
      const template = draft.templates.find((candidate) => candidate.id === input.templateId);
      if (
        input.templateId !== null &&
        (!template ||
          !isAvailableTo(template, courseId) ||
          !canViewTemplate(actorId, template, draft) ||
          (template.visibility === 'personal' && template.ownerId !== actorId) ||
          template.visibility === 'event')
      )
        throw new ApiError('RESOURCE_NOT_FOUND');
      const advisorIds = input.advisorIds ?? [PROFESSOR_ID];
      if (advisorIds.some((id) => !advisors.some((advisor) => advisor.id === id)))
        throw new ApiError('VALIDATION_FAILED');
      draft.events.push({
        kind,
        courseId,
        createdBy: names[actorId]!,
        createdById: actorId,
        description: input.description?.trim() ?? '',
        id: createId('event'),
        name: input.name.trim(),
        scope: input.scope,
        templateId: template?.id ?? null,
        templateTitle: template?.title ?? blankTemplate.title,
        templateVersion: template ? currentVersion(template).number : null,
        advisorIds,
        maxTeams: input.maxTeams ?? DEFAULT_MAX_TEAMS,
        maxTeamSize: input.maxTeamSize ?? DEFAULT_MAX_TEAM_SIZE,
        registrationOpen: kind === 'official' ? false : (input.registrationOpen ?? false),
        registrationDeadline: input.registrationDeadline ?? null,
        schedule: input.schedule ?? defaultSchedule(),
      });
    });
  });
}

export function listEventRegistrations(actorId: string) {
  return respond(() => {
    assertCreator(actorId);
    return db.read().registrations.filter((registration) => registration.studentId === actorId);
  });
}

export function registerForEvent(actorId: string, eventId: string) {
  return respond((): EventRegistration => {
    if (!isStudent(actorId)) throw new ApiError('PERMISSION_DENIED');
    let result: EventRegistration | undefined;
    db.update((draft) => {
      const event = draft.events.find((candidate) => candidate.id === eventId);
      if (!event) throw new ApiError('RESOURCE_NOT_FOUND');
      const existing = draft.registrations.find(
        (registration) => registration.eventId === eventId && registration.studentId === actorId,
      );
      if (existing) {
        result = existing;
        return;
      }
      if (!event.registrationOpen) throw new ApiError('EVENT_REGISTRATION_CLOSED');
      if (event.registrationDeadline && Date.parse(event.registrationDeadline) < Date.now())
        throw new ApiError('EVENT_REGISTRATION_DEADLINE_PASSED');
      if (
        draft.registrations.filter((registration) => registration.eventId === eventId).length >=
        event.maxTeams * (event.maxTeamSize ?? DEFAULT_MAX_TEAM_SIZE)
      )
        throw new ApiError('EVENT_REGISTRATION_LIMIT_REACHED');
      result = {
        id: createId('registration'),
        eventId,
        studentId: actorId,
        createdAt: new Date().toISOString(),
      };
      draft.registrations.push(result);
    });
    return result!;
  });
}

export function setEventRegistrationOpen(
  actorId: string,
  input: { eventId: string; open: boolean },
) {
  return respond(() => {
    assertCreator(actorId);
    db.update((draft) => {
      const event = draft.events.find((candidate) => candidate.id === input.eventId);
      if (!event) throw new ApiError('RESOURCE_NOT_FOUND');
      if (!canManageEvent(actorId, event)) throw new ApiError('PERMISSION_DENIED');
      if (actorId === PROFESSOR_ID && event.kind === 'official')
        throw new ApiError('PERMISSION_DENIED');
      if (
        input.open &&
        event.registrationDeadline &&
        Date.parse(event.registrationDeadline) < Date.now()
      )
        throw new ApiError('EVENT_REGISTRATION_DEADLINE_PASSED');
      event.registrationOpen = input.open;
    });
  });
}

/** Cronograma de partida de um evento novo: três etapas a partir de hoje. */
function defaultSchedule(): EventTemplate['schedule'] {
  const due = (days: number) => new Date(Date.now() + days * DAY).toISOString();

  return [
    { deadline: due(21), name: 'Projeto de pesquisa' },
    { deadline: due(56), name: 'Desenvolvimento' },
    { deadline: due(91), name: 'Versão final' },
  ];
}

/** Troca do template após a criação do evento (RF-TPL-002 E2). */
export function changeEventTemplate(actorId: string, eventId: string) {
  return respond(() => {
    assertCreator(actorId);

    if (db.read().events.some((event) => event.id === eventId)) {
      throw new ApiError('TEMPLATE_ALREADY_FIXED');
    }

    throw new ApiError('RESOURCE_NOT_FOUND');
  });
}

const ACTIVE_KEY = 'vinceart.article';

// O endereço pode indicar o artigo a abrir — é assim que a lista e a notificação levam a ele.
if (typeof window !== 'undefined') {
  const requested = new URLSearchParams(window.location.search).get('artigo');

  if (requested) {
    window.sessionStorage.setItem(ACTIVE_KEY, requested);
  }
}

function resolveCurrentArticle(): Article {
  const { articles } = db.read();
  const activeId = window.sessionStorage.getItem(ACTIVE_KEY) ?? DEMO_ARTICLE_ID;

  return articles.find((article) => article.id === activeId) ?? articles[0]!;
}

/**
 * Artigo aberto nesta aba. As telas de edição, correção, discussão e assistência
 * trabalham sempre sobre ele; cada leitura consulta o cadastro.
 */
export const currentArticle: Article = {
  get advisor() {
    return resolveCurrentArticle().advisor;
  },
  get createdAt() {
    return resolveCurrentArticle().createdAt;
  },
  get ownerId() {
    return resolveCurrentArticle().ownerId;
  },
  get templateId() {
    return resolveCurrentArticle().templateId;
  },
  get templateVersion() {
    return resolveCurrentArticle().templateVersion;
  },
  get event() {
    return resolveCurrentArticle().event;
  },
  get eventId() {
    return resolveCurrentArticle().eventId;
  },
  get id() {
    return resolveCurrentArticle().id;
  },
  get initialContent() {
    return resolveCurrentArticle().initialContent;
  },
  get members() {
    return resolveCurrentArticle().members;
  },
  get milestones() {
    return resolveCurrentArticle().milestones;
  },
  get team() {
    return resolveCurrentArticle().team;
  },
  get title() {
    return resolveCurrentArticle().title;
  },
};

/** Endereço de uma tela já apontando para o artigo — o aberto, quando não informado. */
export function articleHref(path: string, articleId: string = currentArticle.id) {
  const [base = '', hash] = path.split('#');
  const separator = base.includes('?') ? '&' : '?';

  return `${base}${separator}artigo=${encodeURIComponent(articleId)}${hash ? `#${hash}` : ''}`;
}

export function listArticles() {
  return respond(() => db.read().articles);
}

/** Leitura direta do cadastro, para os backends simulados das demais features. */
export function readArticles() {
  return db.read().articles;
}

/** Visibilidade usada também pelo editor e pelos relatórios da demonstração. */
export function canReadArticle(actorId: string, article: Article) {
  if (!names[actorId]) return false;
  if (article.ownerId === actorId || article.members.some((member) => member.id === actorId))
    return true;
  if (actorId === PROFESSOR_ID) return article.advisor.id === actorId;
  if (actorId === ADMIN_ID || actorId === COORDINATOR_ID) {
    const event = db.read().events.find((candidate) => candidate.id === article.eventId);
    return !!event && canManageEvent(actorId, event);
  }
  return false;
}

export type CreateArticleInput = {
  title: string;
  templateId: string | null;
  eventId?: string;
  teamName?: string;
};

function actorMember(actorId: string): TeamMember {
  return (
    students.find((student) => student.id === actorId) ??
    advisors.find((advisor) => advisor.id === actorId) ?? {
      id: actorId,
      initials: actorId === ADMIN_ID ? 'AG' : 'RS',
      name: names[actorId]!,
    }
  );
}

/** Uma produção pode nascer independente ou vinculada ao evento em que o aluno se inscreveu. */
export function createArticle(actorId: string, input: CreateArticleInput) {
  return respond((): Article => {
    assertCreator(actorId);
    if (!input.title.trim()) throw new ApiError('VALIDATION_FAILED');
    let result: Article | undefined;
    db.update((draft) => {
      const event = input.eventId
        ? draft.events.find((candidate) => candidate.id === input.eventId)
        : undefined;
      if (input.eventId && !event) throw new ApiError('RESOURCE_NOT_FOUND');
      if (event) {
        if (!canViewEvent(actorId, event, draft)) throw new ApiError('PERMISSION_DENIED');
        if (isStudent(actorId)) {
          if (
            !draft.registrations.some(
              (registration) =>
                registration.eventId === event.id && registration.studentId === actorId,
            )
          )
            throw new ApiError('EVENT_REGISTRATION_REQUIRED');
        } else if (!canManageEvent(actorId, event)) {
          throw new ApiError('PERMISSION_DENIED');
        }
        if (
          draft.articles.filter((article) => article.eventId === event.id).length >= event.maxTeams
        )
          throw new ApiError('EVENT_TEAM_LIMIT_REACHED');
      }
      const template = draft.templates.find((candidate) => candidate.id === input.templateId);
      if (input.templateId !== null) {
        const usable =
          template &&
          (template.active || event?.templateId === template.id) &&
          (template.visibility === 'standard' ||
            (template.visibility === 'personal' && template.ownerId === actorId) ||
            (event?.templateId === template.id && canViewEvent(actorId, event, draft)) ||
            (template.visibility === 'event' &&
              event?.id === template.eventId &&
              canViewTemplate(actorId, template, draft)) ||
            (!template.visibility &&
              event &&
              (event.templateId === template.id || isAvailableTo(template, event.courseId))));
        if (!usable) throw new ApiError('RESOURCE_NOT_FOUND');
      }
      const version =
        template &&
        (event?.templateId === template.id
          ? template.versions.find((candidate) => candidate.number === event.templateVersion)
          : currentVersion(template));
      const member = actorMember(actorId);
      const advisor = event
        ? (advisors.find((candidate) => event.advisorIds.includes(candidate.id)) ?? {
            id: 'unassigned',
            initials: 'SO',
            name: 'Sem orientador',
          })
        : isStudent(actorId)
          ? { id: 'unassigned', initials: 'SO', name: 'Sem orientador' }
          : member;
      result = {
        advisor,
        ownerId: actorId,
        templateId: template?.id ?? null,
        templateVersion: version?.number ?? null,
        createdAt: new Date().toISOString(),
        event: event?.name ?? 'Produção independente',
        eventId: event?.id ?? '',
        id: createId('article'),
        initialContent: version?.content ?? null,
        members: [member],
        milestones: toMilestones(event?.schedule ?? defaultSchedule()),
        team: input.teamName?.trim() || member.name,
        title: input.title.trim(),
      };
      draft.articles.push(result);
    });
    return result!;
  });
}

export type CreateTeamInput = {
  eventId: string;
  memberIds: string[];
  teamName: string;
  title: string;
};

/**
 * RF-EQP-001 — Criar equipe no evento. A criação da equipe cria o seu artigo, em
 * `STARTED`, com o conteúdo da versão do template que o evento congelou.
 */
export function createTeam(actorId: string, input: CreateTeamInput) {
  return respond((): Article => {
    const members = students.filter((student) => input.memberIds.includes(student.id));

    if (!input.teamName.trim() || !input.title.trim() || members.length === 0) {
      throw new ApiError('VALIDATION_FAILED');
    }

    let created: Article | undefined;

    db.update((draft) => {
      const event = draft.events.find((candidate) => candidate.id === input.eventId);

      if (!event) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }

      const advisor = advisors.find((candidate) => candidate.id === actorId);

      if (!advisor || !event.advisorIds.includes(actorId)) {
        throw new ApiError('ADVISOR_NOT_ASSIGNED_TO_EVENT');
      }

      const teams = draft.articles.filter((article) => article.eventId === event.id);

      if (teams.length >= event.maxTeams) {
        throw new ApiError('EVENT_TEAM_LIMIT_REACHED');
      }

      const template = draft.templates.find((candidate) => candidate.id === event.templateId);
      const frozen = template?.versions.find((version) => version.number === event.templateVersion);

      created = {
        advisor,
        ownerId: actorId,
        templateId: template?.id ?? null,
        templateVersion: frozen?.number ?? null,
        createdAt: new Date().toISOString(),
        event: event.name,
        eventId: event.id,
        id: createId('article'),
        initialContent: frozen?.content ?? null,
        members,
        milestones: toMilestones(event.schedule),
        team: input.teamName.trim(),
        title: input.title.trim(),
      };
      draft.articles.push(created);
    });

    return created!;
  });
}

export type ArticleTemplateInfo = { template: ArticleTemplate; version: number | null };

/** Conteúdo e formatação permanecem na versão escolhida ao criar o artigo. */
export function getArticleTemplate() {
  return respond((): ArticleTemplateInfo => {
    const { events, templates } = db.read();
    const event = events.find((candidate) => candidate.id === currentArticle.eventId);
    const hasSelection = currentArticle.templateId !== undefined;
    const templateId = hasSelection ? currentArticle.templateId : event?.templateId;
    const template = templates.find((candidate) => candidate.id === templateId);
    const version = hasSelection
      ? (currentArticle.templateVersion ?? null)
      : (event?.templateVersion ?? null);
    const frozen = template?.versions.find((candidate) => candidate.number === version);
    const selected = template
      ? { ...template, ...frozen?.format, versions: frozen ? [frozen] : [] }
      : blankTemplate;

    return {
      template: selected,
      version,
    };
  });
}
