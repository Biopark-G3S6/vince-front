export type ArticleStatus = 'STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'FINISHED';

/** Estados do apontamento (RF-REV-004 RN5). */
export type RemarkState = 'OPEN' | 'ADDRESSED' | 'RESOLVED' | 'DISMISSED';

export type RemarkDecision = 'RESOLVED' | 'REOPENED' | 'DISMISSED';

export type Paragraph = {
  heading?: string;
  id: string;
  text: string;
};

export type Milestone = {
  deadline: string;
  id: string;
  name: string;
  order: number;
};

/** Versão entregue: imutável, âncora de apontamentos e comparações (RF-REV-001 RN3). */
export type Submission = {
  /** Entrega registrada pelo sistema no vencimento do prazo (RF-REV-003). */
  automatic: boolean;
  id: string;
  milestoneId: string;
  paragraphs: Paragraph[];
  returnedAt: string | null;
  submittedAt: string;
  submittedBy: string | null;
};

export type Remark = {
  authorId: string;
  createdAt: string;
  decision: { at: string; by: string; kind: RemarkDecision } | null;
  /** Textos anteriores, preservados a cada alteração (RF-REV-005 RN3). */
  history: Array<{ changedAt: string; text: string }>;
  id: string;
  milestoneId: string;
  paragraphId: string;
  /** Invisível à equipe até a devolução (RF-REV-004 RN3). */
  published: boolean;
  /** Trecho selecionado na versão entregue. */
  quote: string;
  /** Mensagens da discussão que respondem a este apontamento (RF-DSC-003 RN2). */
  replyMessageIds: string[];
  state: RemarkState;
  submissionId: string;
  text: string;
};

export type ReviewCycle = {
  currentMilestoneId: string;
  draft: Paragraph[];
  lastEditedAt: string;
  milestones: Milestone[];
  remarks: Remark[];
  status: ArticleStatus;
  submissions: Submission[];
};

export const statusPipeline: ArticleStatus[] = ['STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'FINISHED'];

export function isPending(remark: Remark) {
  return remark.state === 'OPEN' || remark.state === 'ADDRESSED';
}

export function findMilestone(cycle: ReviewCycle, milestoneId: string) {
  return cycle.milestones.find((milestone) => milestone.id === milestoneId);
}

export function latestSubmission(cycle: ReviewCycle): Submission | undefined {
  return cycle.submissions[cycle.submissions.length - 1];
}

export function previousSubmission(cycle: ReviewCycle, submissionId: string) {
  const index = cycle.submissions.findIndex((submission) => submission.id === submissionId);
  return index > 0 ? cycle.submissions[index - 1] : undefined;
}

export function isLastMilestone(cycle: ReviewCycle) {
  const last = cycle.milestones[cycle.milestones.length - 1];
  return last?.id === cycle.currentMilestoneId;
}

/** Texto apresentado como estado atual: a versão em correção ou o rascunho em edição. */
export function currentParagraphs(cycle: ReviewCycle): Paragraph[] {
  return cycle.status === 'IN_PROGRESS' || cycle.status === 'STARTED'
    ? cycle.draft
    : (latestSubmission(cycle)?.paragraphs ?? cycle.draft);
}
