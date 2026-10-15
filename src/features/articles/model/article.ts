import type { JSONContent } from '@tiptap/core';

export type TeamMember = {
  id: string;
  initials: string;
  name: string;
};

export type ArticleMilestone = {
  deadline: string;
  id: string;
  name: string;
  order: number;
};

/**
 * Artigo de uma equipe. Nasce com a equipe, na proporção de um para um, no estado
 * `STARTED` e com o conteúdo do template que o evento congelou (RF-EQP-001 RN1,
 * RF-TPL-002).
 */
export type Article = {
  advisor: TeamMember;
  createdAt: string;
  event: string;
  eventId: string;
  id: string;
  /** Conteúdo de partida; `null` quando o evento optou por documento em branco. */
  initialContent: JSONContent | null;
  members: TeamMember[];
  /** Etapas do cronograma do evento, copiadas na criação da equipe. */
  milestones: ArticleMilestone[];
  team: string;
  title: string;
};

export const DEMO_ARTICLE_ID = 'article-neural';

/** Alunos da turma que podem compor equipes nesta demonstração. */
export const students: TeamMember[] = [
  { id: 'user-joao', initials: 'JP', name: 'João Pedro Silva' },
  { id: 'user-maria', initials: 'MR', name: 'Maria Rita Costa' },
  { id: 'user-carlos', initials: 'CS', name: 'Carlos Santos' },
  { id: 'user-beatriz', initials: 'BA', name: 'Beatriz Almeida' },
  { id: 'user-caio', initials: 'CF', name: 'Caio Ferreira' },
  { id: 'user-daniela', initials: 'DP', name: 'Daniela Prado' },
];

export const advisors: TeamMember[] = [
  { id: 'user-almeida', initials: 'PA', name: 'Prof. Almeida' },
];
