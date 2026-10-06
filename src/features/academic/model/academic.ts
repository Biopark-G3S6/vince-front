export type CourseStatus = 'active' | 'inactive';
export type ClassStatus = 'active' | 'planned' | 'closed';
export type EventStatus = 'running' | 'planning' | 'finished' | 'canceled';
export type ArticleStatus = 'started' | 'inProgress' | 'inReview' | 'finished';

export type Coordinator = {
  email: string;
  name: string;
};

export type Course = {
  classes: number;
  code: string;
  coordinator: Coordinator | null;
  createdAt: string;
  events: number;
  id: string;
  institution: string;
  name: string;
  students: number;
  status: CourseStatus;
};

export type ClassInvite = {
  code: string;
  expiresAt: string;
  status: 'active' | 'revoked';
  uses: number;
};

export type ClassGroup = {
  course: string;
  endDate: string;
  id: string;
  invitations: ClassInvite[];
  name: string;
  professors: string[];
  startDate: string;
  status: ClassStatus;
  students: number;
  term: string;
};

export type Milestone = {
  date: string;
  name: string;
  order: number;
};

export type AcademicEvent = {
  advisors: string[];
  course: string;
  endDate: string;
  id: string;
  maxTeamSize: number;
  maxTeams: number;
  milestones: Milestone[];
  participants: number;
  scope: 'Instituição' | 'Curso' | 'Turma';
  startDate: string;
  status: EventStatus;
  teams: number;
  theme: string;
  title: string;
};

export type TeamMember = {
  course: string;
  name: string;
  role: 'Líder' | 'Autor' | 'Coautor';
};

export type Team = {
  article: string;
  event: string;
  id: string;
  members: TeamMember[];
  name: string;
  progress: number;
  responsibleAdvisor: string;
  status: ArticleStatus;
};

export type ArticleEvaluation = {
  articleGrade: number;
  currentMilestone: string;
  dueDate: string;
  externalPublication: {
    date: string;
    type: string;
    url: string;
    vehicle: string;
  } | null;
  feedback: string;
  id: string;
  memberGrades: Array<{
    grade: number;
    name: string;
  }>;
  status: ArticleStatus;
  team: string;
  title: string;
};

export const courses: Course[] = [
  {
    classes: 6,
    code: 'ADM-01',
    coordinator: { email: 'ricardo.santos@frt.edu.br', name: 'Dr. Ricardo Santos' },
    createdAt: '15 Out, 2023',
    events: 4,
    id: 'course-adm',
    institution: 'Faculdade Regional de Tecnologia',
    name: 'Administração',
    students: 182,
    status: 'active',
  },
  {
    classes: 4,
    code: 'BIO-02',
    coordinator: { email: 'marina.costa@frt.edu.br', name: 'Dra. Marina Costa' },
    createdAt: '02 Set, 2023',
    events: 3,
    id: 'course-bio',
    institution: 'Faculdade Regional de Tecnologia',
    name: 'Ciências Biológicas',
    students: 126,
    status: 'active',
  },
  {
    classes: 3,
    code: 'DIR-03',
    coordinator: null,
    createdAt: '12 Ago, 2022',
    events: 1,
    id: 'course-law',
    institution: 'Faculdade Regional de Tecnologia',
    name: 'Direito',
    students: 94,
    status: 'inactive',
  },
];

export const classGroups: ClassGroup[] = [
  {
    course: 'Administração',
    endDate: '18 Dez, 2026',
    id: 'class-adm-2026-a',
    invitations: [
      { code: 'ADM26-A', expiresAt: '30 Out, 2026', status: 'active', uses: 18 },
      { code: 'ADM26-P2', expiresAt: '12 Nov, 2026', status: 'revoked', uses: 4 },
    ],
    name: 'Administração 2026.1 - A',
    professors: ['Prof. Almeida', 'Profa. Letícia Nunes'],
    startDate: '03 Fev, 2026',
    status: 'active',
    students: 42,
    term: '2026.1',
  },
  {
    course: 'Ciências Biológicas',
    endDate: '10 Dez, 2026',
    id: 'class-bio-2026-b',
    invitations: [{ code: 'BIO26-B', expiresAt: '05 Nov, 2026', status: 'active', uses: 9 }],
    name: 'Biotecnologia 2026.2 - B',
    professors: ['Dra. Marina Costa'],
    startDate: '04 Ago, 2026',
    status: 'planned',
    students: 31,
    term: '2026.2',
  },
  {
    course: 'Direito',
    endDate: '12 Dez, 2025',
    id: 'class-law-2025-a',
    invitations: [],
    name: 'Direito Constitucional 2025.2',
    professors: ['Prof. Bruno Paiva'],
    startDate: '08 Ago, 2025',
    status: 'closed',
    students: 38,
    term: '2025.2',
  },
];

export const academicEvents: AcademicEvent[] = [
  {
    advisors: ['Prof. Almeida', 'Dra. Helena Torres', 'Dr. Ricardo Santos'],
    course: 'Administração',
    endDate: '18 Out, 2026',
    id: 'event-congresso-2026',
    maxTeamSize: 5,
    maxTeams: 18,
    milestones: [
      { date: '20 Ago, 2026', name: 'Resumo expandido', order: 1 },
      { date: '25 Set, 2026', name: 'Versão para revisão', order: 2 },
      { date: '05 Nov, 2026', name: 'Entrega final', order: 3 },
    ],
    participants: 60,
    scope: 'Curso',
    startDate: '15 Out, 2026',
    status: 'running',
    teams: 15,
    theme: 'Inovação e transformação digital no ensino superior contemporâneo.',
    title: 'Congresso Acadêmico 2026',
  },
  {
    advisors: ['Dra. Marina Costa', 'Prof. Gustavo Lima'],
    course: 'Ciências Biológicas',
    endDate: '05 Nov, 2026',
    id: 'event-bio-2026',
    maxTeamSize: 4,
    maxTeams: 10,
    milestones: [
      { date: '05 Set, 2026', name: 'Protocolo de pesquisa', order: 1 },
      { date: '18 Out, 2026', name: 'Parecer do orientador', order: 2 },
      { date: '02 Nov, 2026', name: 'Submissão final', order: 3 },
    ],
    participants: 32,
    scope: 'Turma',
    startDate: '02 Nov, 2026',
    status: 'planning',
    teams: 8,
    theme: 'Avanços na engenharia genética e ética na pesquisa.',
    title: 'Simpósio de Biotecnologia',
  },
  {
    advisors: ['Prof. Bruno Paiva'],
    course: 'Direito',
    endDate: '12 Set, 2025',
    id: 'event-law-2025',
    maxTeamSize: 6,
    maxTeams: 24,
    milestones: [
      { date: '15 Jul, 2025', name: 'Ementa aprovada', order: 1 },
      { date: '12 Ago, 2025', name: 'Mesa avaliadora', order: 2 },
      { date: '10 Set, 2025', name: 'Anais publicados', order: 3 },
    ],
    participants: 140,
    scope: 'Curso',
    startDate: '10 Set, 2025',
    status: 'finished',
    teams: 22,
    theme: 'Direitos constitucionais na era da inteligência artificial.',
    title: 'Jornada Jurídica Anual',
  },
];

export const teams: Team[] = [
  {
    article: 'Análise de Dados em Redes Acadêmicas',
    event: 'Congresso Acadêmico 2026',
    id: 'team-alpha',
    members: [
      { course: 'Administração', name: 'João Pedro', role: 'Líder' },
      { course: 'Administração', name: 'Ana Clara', role: 'Autor' },
      { course: 'Ciências Biológicas', name: 'Lucas Martins', role: 'Coautor' },
    ],
    name: 'Alpha Team',
    progress: 75,
    responsibleAdvisor: 'Prof. Almeida',
    status: 'inReview',
  },
  {
    article: 'Impacto Ambiental Urbano em Projetos Locais',
    event: 'Simpósio de Biotecnologia',
    id: 'team-beta',
    members: [
      { course: 'Ciências Biológicas', name: 'Mariana Alves', role: 'Líder' },
      { course: 'Administração', name: 'Pedro Gomes', role: 'Autor' },
    ],
    name: 'Beta Researchers',
    progress: 40,
    responsibleAdvisor: 'Dra. Marina Costa',
    status: 'inProgress',
  },
  {
    article: 'Novas Abordagens em IA para Gestão Acadêmica',
    event: 'Congresso Acadêmico 2026',
    id: 'team-gamma',
    members: [
      { course: 'Administração', name: 'Carolina Reis', role: 'Líder' },
      { course: 'Administração', name: 'Vitor Mendes', role: 'Autor' },
      { course: 'Direito', name: 'Rafaela Neri', role: 'Coautor' },
      { course: 'Ciências Biológicas', name: 'Nina Duarte', role: 'Coautor' },
    ],
    name: 'Gama Innovation',
    progress: 90,
    responsibleAdvisor: 'Dra. Helena Torres',
    status: 'finished',
  },
];

export const eligibleStudents = [
  'Beatriz Almeida',
  'Caio Ferreira',
  'Daniela Prado',
  'Eduardo Silva',
  'Fernanda Rocha',
];

export const articles: ArticleEvaluation[] = [
  {
    articleGrade: 8.7,
    currentMilestone: 'Revisão metodológica',
    dueDate: '05 Nov, 2026',
    externalPublication: null,
    feedback:
      'Excelente fundamentação teórica. Revisar a metodologia da seção 3 para maior clareza antes da submissão final.',
    id: 'article-alpha',
    memberGrades: [
      { grade: 8.5, name: 'João Pedro' },
      { grade: 9.1, name: 'Ana Clara' },
      { grade: 8.2, name: 'Lucas Martins' },
    ],
    status: 'inReview',
    team: 'Alpha Team',
    title: 'Análise de Redes Neurais em Saúde',
  },
  {
    articleGrade: 7.9,
    currentMilestone: 'Coleta de evidências',
    dueDate: '18 Out, 2026',
    externalPublication: {
      date: '20 Set, 2026',
      type: 'Resumo expandido',
      url: 'https://doi.org/10.0000/vinceart-alpha',
      vehicle: 'Anais do Congresso Acadêmico',
    },
    feedback:
      'Boa evolução. Consolidar as referências externas e ajustar a discussão dos resultados.',
    id: 'article-beta',
    memberGrades: [
      { grade: 7.8, name: 'Mariana Alves' },
      { grade: 8.0, name: 'Pedro Gomes' },
    ],
    status: 'inProgress',
    team: 'Beta Researchers',
    title: 'Impacto Ambiental Urbano',
  },
];

export const dashboardActivities = [
  {
    detail: 'Equipe Alpha · Há 2 horas',
    title: 'Novo artigo submetido: "Análise de Redes Neurais em Saúde"',
  },
  {
    detail: 'Comissão de Eventos · Há 5 horas',
    title: 'Marco atingido: Simpósio de Biotecnologia aberto para inscrições.',
  },
  {
    detail: 'Sistema · Ontem',
    title: 'Revisão pendente: 3 artigos aguardam avaliação do coordenador.',
  },
];
