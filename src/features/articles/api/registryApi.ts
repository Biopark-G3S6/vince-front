import type { JSONContent } from '@tiptap/core';

import { ApiError } from '@shared/api/apiError';
import { createId, createMockCollection, respond } from '@shared/api/mockDb';

import {
  blankTemplate,
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
import { advisors, DEMO_ARTICLE_ID, students, type Article } from '../model/article';

/**
 * Backend simulado do cadastro acadêmico de que o artigo depende: templates
 * (RF-TPL-001, RF-TPL-002), eventos e equipes com os seus artigos (RF-EQP-001).
 */

type RegistryDb = { articles: Article[]; events: EventTemplate[]; templates: StoredTemplate[] };

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

const db = createMockCollection<RegistryDb>('registry', () => ({
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

function canMaintain(actorId: string, courseId: string | null) {
  // O administrador mantém os templates da instituição; o coordenador, apenas os
  // restritos ao seu curso; o professor não mantém templates (RF-TPL-001 RN2).
  return actorId === ADMIN_ID || (actorId === COORDINATOR_ID && courseId === OWN_COURSE);
}

function assertCreator(actorId: string) {
  if (!names[actorId]) {
    throw new ApiError('PERMISSION_DENIED');
  }
}

export function listTemplates(actorId: string) {
  return respond(() => {
    assertCreator(actorId);

    return db.read().templates.map((template) => ({
      ...template,
      canMaintain: canMaintain(actorId, template.courseId),
    }));
  });
}

export type SaveTemplateInput = {
  content: JSONContent;
  courseId: string | null;
  description: string;
  format: TemplateFormat;
  id?: string;
  title: string;
};

/** RF-TPL-001 — Criar ou alterar template; a alteração gera versão nova. */
export function saveTemplate(actorId: string, input: SaveTemplateInput) {
  return respond(() => {
    if (!input.title.trim()) {
      throw new ApiError('VALIDATION_FAILED');
    }

    if (!canMaintain(actorId, input.courseId)) {
      throw new ApiError('PERMISSION_DENIED');
    }

    db.update((draft) => {
      const existing = draft.templates.find((template) => template.id === input.id);
      const version = {
        content: input.content,
        createdAt: new Date().toISOString(),
        createdBy: names[actorId]!,
        number: existing ? currentVersion(existing).number + 1 : 1,
      };
      const fields = {
        ...input.format,
        courseId: input.courseId,
        description: input.description.trim(),
        label: input.title.trim(),
        title: input.title.trim(),
      };

      if (existing) {
        if (!canMaintain(actorId, existing.courseId)) {
          throw new ApiError('PERMISSION_DENIED');
        }

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

/** Desativar não alcança evento que já congelou a versão (RF-TPL-001 E3). */
export function setTemplateActive(actorId: string, templateId: string, active: boolean) {
  return respond(() => {
    db.update((draft) => {
      const template = draft.templates.find((candidate) => candidate.id === templateId);

      if (!template) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }

      if (!canMaintain(actorId, template.courseId)) {
        throw new ApiError('PERMISSION_DENIED');
      }

      template.active = active;
    });
  });
}

export function listEvents(actorId: string) {
  return respond(() => {
    assertCreator(actorId);
    return db.read().events;
  });
}

/** Escopos em que cada perfil é dono do evento que cria (RE-01). */
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
};

/** RF-TPL-002 — A seleção do template ocorre na criação do evento e é imutável. */
export function createEvent(actorId: string, input: CreateEventInput) {
  return respond(() => {
    if (!input.name.trim()) {
      throw new ApiError('VALIDATION_FAILED');
    }

    const courseId = input.scope === 'institution' ? null : input.courseId;
    const ownsScope =
      allowedScopes(actorId).includes(input.scope) &&
      (actorId === ADMIN_ID || courseId === OWN_COURSE);

    if (!ownsScope) {
      throw new ApiError('PERMISSION_DENIED');
    }

    db.update((draft) => {
      const template = draft.templates.find((candidate) => candidate.id === input.templateId);

      // Template indisponível ao escopo do evento (E1).
      if (input.templateId !== null && (!template || !isAvailableTo(template, courseId))) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }

      draft.events.push({
        courseId,
        createdBy: names[actorId]!,
        id: createId('event'),
        name: input.name.trim(),
        scope: input.scope,
        templateId: template?.id ?? null,
        templateTitle: template?.title ?? blankTemplate.title,
        templateVersion: template ? currentVersion(template).number : null,
        advisorIds: [PROFESSOR_ID],
        maxTeams: DEFAULT_MAX_TEAMS,
        schedule: defaultSchedule(),
      });
    });
  });
}

const DAY = 86_400_000;
const DEFAULT_MAX_TEAMS = 10;

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

/** Template do evento do artigo aberto: a formatação de partida exibida no editor. */
export function getArticleTemplate() {
  return respond((): ArticleTemplateInfo => {
    const { events, templates } = db.read();
    const event = events.find((candidate) => candidate.id === currentArticle.eventId);
    const template = templates.find((candidate) => candidate.id === event?.templateId);

    return { template: template ?? blankTemplate, version: event?.templateVersion ?? null };
  });
}
