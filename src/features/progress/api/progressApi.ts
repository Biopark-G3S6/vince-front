import {
  canReadArticle,
  DEMO_ARTICLE_ID,
  listEvents,
  readArticles,
  type Article,
} from '@features/articles';
import { countMessagesByAuthor } from '@features/discussion';
import { findMilestone, isPending, readCycleOf } from '@features/review';
import { ApiError } from '@shared/api/apiError';
import { respond } from '@shared/api/mockDb';

import {
  evaluateRiskSignals,
  type CourseEvent,
  type CourseReport,
  type TeamContribution,
  type TeamProgress,
  type TeamWithSignals,
} from '../model/progress';

/**
 * Backend simulado do acompanhamento (RF-ACP-001 a 006). Só apresenta o que as outras
 * categorias registraram: nenhuma função daqui altera artigo, apontamento ou nota.
 */

const ADVISOR_ID = 'user-almeida';
const COORDINATOR_ID = 'user-ricardo';
const ADMIN_ID = 'user-admin';

const congressSchedule = [
  { deadline: '2026-09-16T02:59:00.000Z', name: 'Projeto de pesquisa' },
  { deadline: '2026-10-21T02:59:00.000Z', name: 'Referencial teórico' },
  { deadline: '2026-11-06T02:59:00.000Z', name: 'Versão final' },
];

const symposiumSchedule = [
  { deadline: '2026-10-14T02:59:00.000Z', name: 'Relatório parcial' },
  { deadline: '2026-11-20T02:59:00.000Z', name: 'Artigo completo' },
];

const events = [
  { id: 'event-congress', name: 'Congresso 2026', schedule: congressSchedule, scope: 'course' },
  {
    id: 'event-symposium',
    name: 'Simpósio de Biotecnologia',
    schedule: symposiumSchedule,
    scope: 'class',
  },
] as const;

const otherTeams: TeamProgress[] = [
  {
    advisor: 'Prof. Almeida',
    advisorId: ADVISOR_ID,
    articleStatus: 'IN_PROGRESS',
    articleTitle: 'Impacto Ambiental Urbano em Projetos Locais',
    consecutiveAutomaticDeliveries: 2,
    delivery: 'pending',
    event: 'Simpósio de Biotecnologia',
    eventId: 'event-symposium',
    id: 'team-beta',
    lastEditedAt: '2026-09-28T17:20:00.000Z',
    lastReturnedAt: '2026-09-30T12:00:00.000Z',
    members: [
      { everEdited: true, name: 'Mariana Alves' },
      { everEdited: true, name: 'Pedro Gomes' },
    ],
    milestone: symposiumSchedule[0]!,
    name: 'Equipe Beta',
    pendingRemarks: 2,
    unaddressedRemarks: 2,
  },
  {
    advisor: 'Prof. Almeida',
    advisorId: ADVISOR_ID,
    articleStatus: 'IN_REVIEW',
    articleTitle: 'Novas Abordagens em IA para Gestão Acadêmica',
    consecutiveAutomaticDeliveries: 0,
    delivery: 'spontaneous',
    event: 'Congresso 2026',
    eventId: 'event-congress',
    id: 'team-gamma',
    lastEditedAt: '2026-10-11T22:10:00.000Z',
    lastReturnedAt: '2026-09-19T12:00:00.000Z',
    members: [
      { everEdited: true, name: 'Carolina Reis' },
      { everEdited: true, name: 'Vitor Mendes' },
      { everEdited: true, name: 'Rafaela Neri' },
    ],
    milestone: congressSchedule[1]!,
    name: 'Equipe Gama',
    pendingRemarks: 0,
    unaddressedRemarks: 0,
  },
  {
    advisor: 'Prof. Almeida',
    advisorId: ADVISOR_ID,
    articleStatus: 'IN_PROGRESS',
    articleTitle: 'Gestão de Resíduos em Pequenas Empresas',
    consecutiveAutomaticDeliveries: 0,
    delivery: 'pending',
    event: 'Congresso 2026',
    eventId: 'event-congress',
    id: 'team-delta',
    lastEditedAt: '2026-10-11T14:45:00.000Z',
    lastReturnedAt: '2026-09-18T12:00:00.000Z',
    members: [
      { everEdited: true, name: 'Beatriz Almeida' },
      { everEdited: false, name: 'Caio Ferreira' },
      { everEdited: true, name: 'Daniela Prado' },
    ],
    milestone: congressSchedule[1]!,
    name: 'Equipe Delta',
    pendingRemarks: 4,
    unaddressedRemarks: 4,
  },
  {
    advisor: 'Dra. Marina Costa',
    advisorId: 'user-marina',
    articleStatus: 'IN_REVIEW',
    articleTitle: 'Economia Circular no Varejo Regional',
    consecutiveAutomaticDeliveries: 1,
    delivery: 'automatic',
    event: 'Congresso 2026',
    eventId: 'event-congress',
    id: 'team-epsilon',
    lastEditedAt: '2026-10-03T10:00:00.000Z',
    lastReturnedAt: '2026-09-20T12:00:00.000Z',
    members: [
      { everEdited: true, name: 'Eduardo Silva' },
      { everEdited: true, name: 'Fernanda Rocha' },
    ],
    milestone: congressSchedule[1]!,
    name: 'Equipe Épsilon',
    pendingRemarks: 1,
    unaddressedRemarks: 0,
  },
  {
    advisor: 'Dra. Marina Costa',
    advisorId: 'user-marina',
    articleStatus: 'FINISHED',
    articleTitle: 'Biofertilizantes em Cultivos Urbanos',
    consecutiveAutomaticDeliveries: 0,
    delivery: 'spontaneous',
    event: 'Simpósio de Biotecnologia',
    eventId: 'event-symposium',
    id: 'team-zeta',
    lastEditedAt: '2026-10-01T16:30:00.000Z',
    lastReturnedAt: '2026-10-05T12:00:00.000Z',
    members: [
      { everEdited: true, name: 'Nina Duarte' },
      { everEdited: true, name: 'Lucas Martins' },
    ],
    milestone: symposiumSchedule[1]!,
    name: 'Equipe Zeta',
    pendingRemarks: 0,
    unaddressedRemarks: 0,
  },
];

/** Cada equipe cadastrada reflete o estado corrente do seu ciclo de correção. */
function registeredTeam(article: Article): TeamProgress {
  const cycle = readCycleOf(article.id);
  const milestone = findMilestone(cycle, cycle.currentMilestoneId);
  const delivered = cycle.submissions.find(
    (submission) => submission.milestoneId === cycle.currentMilestoneId,
  );
  const returned = cycle.submissions.filter((submission) => submission.returnedAt);
  let consecutiveAutomatic = 0;

  for (let index = cycle.submissions.length - 1; index >= 0; index -= 1) {
    if (!cycle.submissions[index]!.automatic) {
      break;
    }

    consecutiveAutomatic += 1;
  }

  return {
    articleId: article.id,
    advisor: article.advisor.name,
    advisorId: article.advisor.id,
    articleStatus: cycle.status,
    articleTitle: article.title,
    consecutiveAutomaticDeliveries: consecutiveAutomatic,
    delivery:
      !delivered || delivered.returnedAt
        ? 'pending'
        : delivered.automatic
          ? 'automatic'
          : 'spontaneous',
    event: article.event,
    eventId: article.eventId,
    id: article.id === DEMO_ARTICLE_ID ? 'team-alpha' : article.id,
    lastEditedAt: cycle.lastEditedAt,
    lastReturnedAt: returned[returned.length - 1]?.returnedAt ?? null,
    members: article.members.map((member) => ({ everEdited: true, name: member.name })),
    milestone: { deadline: milestone?.deadline ?? '', name: milestone?.name ?? '' },
    name: article.team,
    pendingRemarks: cycle.remarks.filter(isPending).length,
    unaddressedRemarks: cycle.remarks.filter(
      (remark) => remark.state === 'OPEN' && remark.published,
    ).length,
  };
}

async function allTeams(actorId: string): Promise<TeamWithSignals[]> {
  const now = new Date();
  const teams = [
    ...readArticles()
      .filter((article) => canReadArticle(actorId, article))
      .map(registeredTeam),
    ...otherTeams,
  ];

  return teams.map((team) => ({ ...team, signals: evaluateRiskSignals(team, now) }));
}

/** RF-ACP-001 — Apenas as equipes de que o ator é orientador responsável (RN1). */
export async function listAdvisorTeams(actorId: string) {
  return (await allTeams(actorId)).filter((team) => team.advisorId === actorId);
}

/** RF-ACP-002 — Eventos do curso do coordenador, com o andamento agregado. */
export async function listCourseEvents(actorId: string): Promise<CourseEvent[]> {
  if (actorId !== COORDINATOR_ID) {
    throw new ApiError('PERMISSION_DENIED');
  }

  const teams = await allTeams(actorId);
  const officialEvents = await listEvents(actorId);
  const courseEvents = [
    ...officialEvents,
    ...events.filter((event) => !officialEvents.some((current) => current.id === event.id)),
  ];

  return courseEvents.map((event) => {
    const eventTeams = teams.filter((team) => team.eventId === event.id);

    return {
      concluded: eventTeams.filter((team) => team.articleStatus === 'FINISHED').length,
      deliveredCurrent: eventTeams.filter((team) => team.delivery !== 'pending').length,
      id: event.id,
      name: event.name,
      schedule: [...event.schedule],
      scope: event.scope,
      teams: eventTeams,
      withSignal: eventTeams.filter((team) => team.signals.length > 0).length,
    };
  });
}

const contributionSeeds: Record<string, Omit<TeamContribution, 'teamId' | 'teamName'>> = {
  'team-beta': {
    imported: true,
    members: [
      { messages: 3, name: 'Mariana Alves', remarksAddressed: 1, sessions: 2, textShare: 0 },
      { messages: 1, name: 'Pedro Gomes', remarksAddressed: 0, sessions: 1, textShare: 0 },
    ],
  },
  'team-delta': {
    imported: false,
    members: [
      { messages: 6, name: 'Beatriz Almeida', remarksAddressed: 2, sessions: 11, textShare: 0.58 },
      { messages: 0, name: 'Caio Ferreira', remarksAddressed: 0, sessions: 0, textShare: 0 },
      { messages: 4, name: 'Daniela Prado', remarksAddressed: 1, sessions: 8, textShare: 0.42 },
    ],
  },
  'team-gamma': {
    imported: false,
    members: [
      { messages: 5, name: 'Carolina Reis', remarksAddressed: 3, sessions: 9, textShare: 0.37 },
      { messages: 4, name: 'Rafaela Neri', remarksAddressed: 2, sessions: 7, textShare: 0.3 },
      { messages: 7, name: 'Vitor Mendes', remarksAddressed: 2, sessions: 10, textShare: 0.33 },
    ],
  },
};

/** RF-ACP-004 — Contribuição de cada integrante, restrita ao orientador responsável. */
export async function getContribution(actorId: string, teamId: string): Promise<TeamContribution> {
  const team = (await allTeams(actorId)).find((candidate) => candidate.id === teamId);

  if (!team) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }

  if (team.advisorId !== actorId) {
    throw new ApiError('PERMISSION_DENIED');
  }

  if (teamId === 'team-alpha') {
    const messages = await countMessagesByAuthor();
    const facts = [
      { remarksAddressed: 1, sessions: 2, textShare: 0.46 },
      { remarksAddressed: 2, sessions: 2, textShare: 0.41 },
      { remarksAddressed: 0, sessions: 1, textShare: 0.13 },
    ];

    return {
      imported: false,
      members: readArticles()[0]!.members.map((member, index) => ({
        ...facts[index]!,
        messages: messages[member.id] ?? 0,
        name: member.name,
      })),
      teamId,
      teamName: team.name,
    };
  }

  const seeded = contributionSeeds[teamId];

  // Equipe recém-criada: ainda sem histórico de edição registrado.
  return {
    ...(seeded ?? {
      imported: false,
      members: team.members.map((member) => ({
        messages: 0,
        name: member.name,
        remarksAddressed: 0,
        sessions: 0,
        textShare: 0,
      })),
    }),
    teamId,
    teamName: team.name,
  };
}

const reportCourses = [
  { id: 'course-adm', name: 'Administração' },
  { id: 'course-bio', name: 'Ciências Biológicas' },
];

/** Cursos ao alcance do ator: o que coordena, ou os da instituição que administra. */
export function listReportCourses(actorId: string) {
  return respond(() => {
    if (actorId === ADMIN_ID) {
      return reportCourses;
    }

    if (actorId === COORDINATOR_ID) {
      return reportCourses.slice(0, 1);
    }

    throw new ApiError('PERMISSION_DENIED');
  });
}

/** RF-ACP-005 — Relatório de produção do curso no período. */
export async function generateReport(
  actorId: string,
  courseId: string,
  period: string,
): Promise<CourseReport> {
  const reachable = await listReportCourses(actorId);
  const course = reachable.find((candidate) => candidate.id === courseId);

  if (!course) {
    throw new ApiError('PERMISSION_DENIED');
  }

  const base = { course: course.name, generatedAt: new Date().toISOString(), period };

  if (courseId === 'course-adm' && period === '2026.2') {
    const teams = await allTeams(actorId);
    const officialEvents = await listEvents(actorId);
    const courseEvents = [
      ...officialEvents,
      ...events.filter((event) => !officialEvents.some((current) => current.id === event.id)),
    ];

    return {
      ...base,
      articleGradeAverage: 8.4,
      concluded: teams.filter((team) => team.articleStatus === 'FINISHED').length,
      events: courseEvents.map((event) => ({
        name: event.name,
        teams: teams.filter((team) => team.eventId === event.id).length,
      })),
      externalPublications: 1,
      individualGradeAverage: 8.1,
      lagging: teams
        .filter((team) => team.consecutiveAutomaticDeliveries > 0)
        .map((team) => ({ event: team.event, milestone: team.milestone.name, team: team.name })),
      notConcluded: teams.filter((team) => team.articleStatus !== 'FINISHED').length,
      students: teams.reduce((sum, team) => sum + team.members.length, 0),
    };
  }

  if (courseId === 'course-adm' && period === '2026.1') {
    return {
      ...base,
      articleGradeAverage: 7.9,
      concluded: 9,
      events: [
        { name: 'Mostra de Pesquisa 2026', teams: 8 },
        { name: 'Jornada de Administração', teams: 4 },
      ],
      externalPublications: 3,
      individualGradeAverage: 7.6,
      lagging: [
        { event: 'Mostra de Pesquisa 2026', milestone: 'Versão final', team: 'Equipe Lambda' },
      ],
      notConcluded: 3,
      students: 34,
    };
  }

  // Período sem dados: relatório vazio, e não erro (E1).
  return {
    ...base,
    articleGradeAverage: null,
    concluded: 0,
    events: [],
    externalPublications: 0,
    individualGradeAverage: null,
    lagging: [],
    notConcluded: 0,
    students: 0,
  };
}
