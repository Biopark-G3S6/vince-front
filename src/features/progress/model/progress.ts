export type ArticleStatus = 'STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'FINISHED';

export type DeliveryState = 'pending' | 'spontaneous' | 'automatic';

/** Situação registrada de uma equipe (RF-ACP-001). Nada aqui é juízo do sistema. */
export type TeamProgress = {
  /** Apenas equipes com artigo cadastrado podem abrir o editor e o ciclo de revisão. */
  articleId?: string;
  advisor: string;
  advisorId: string;
  articleStatus: ArticleStatus;
  articleTitle: string;
  /** Entregas automáticas por vencimento de prazo em etapas seguidas (RF-REV-003). */
  consecutiveAutomaticDeliveries: number;
  delivery: DeliveryState;
  event: string;
  eventId: string;
  id: string;
  /** Última alteração do texto por qualquer integrante (RN3). */
  lastEditedAt: string;
  lastReturnedAt: string | null;
  members: Array<{ everEdited: boolean; name: string }>;
  milestone: { deadline: string; name: string };
  name: string;
  pendingRemarks: number;
  /** Apontamentos devolvidos que seguem sem atendimento entre etapas. */
  unaddressedRemarks: number;
};

/** Condições de risco que o sistema detecta (RF-ACP-003 RN1). */
export type RiskSignal =
  | 'NO_RECENT_EDIT'
  | 'REPEATED_AUTOMATIC_DELIVERY'
  | 'REMARKS_ACCUMULATED'
  | 'MEMBER_NEVER_EDITED'
  | 'DEADLINE_NEAR_WITHOUT_CHANGE';

export type TeamWithSignals = TeamProgress & { signals: RiskSignal[] };

/** Limiares de cada condição — decisão de implementação (RF-ACP-003 RN2). */
export const riskThresholds = {
  automaticDeliveries: 2,
  deadlineDays: 3,
  idleDays: 7,
  unaddressedRemarks: 3,
};

const DAY = 86_400_000;

/**
 * Avalia as condições de risco de uma equipe. O sinal é subsídio ao orientador e ao
 * coordenador: não altera o artigo, não gera apontamento e não afeta nota (RN3).
 */
export function evaluateRiskSignals(team: TeamProgress, now: Date): RiskSignal[] {
  if (team.articleStatus === 'FINISHED') {
    return [];
  }

  const signals: RiskSignal[] = [];
  const editing = team.articleStatus === 'IN_PROGRESS' || team.articleStatus === 'STARTED';
  const idleDays = (now.getTime() - new Date(team.lastEditedAt).getTime()) / DAY;
  const daysToDeadline = (new Date(team.milestone.deadline).getTime() - now.getTime()) / DAY;

  if (editing && idleDays >= riskThresholds.idleDays) {
    signals.push('NO_RECENT_EDIT');
  }

  if (team.consecutiveAutomaticDeliveries >= riskThresholds.automaticDeliveries) {
    signals.push('REPEATED_AUTOMATIC_DELIVERY');
  }

  if (team.unaddressedRemarks >= riskThresholds.unaddressedRemarks) {
    signals.push('REMARKS_ACCUMULATED');
  }

  if (team.members.some((member) => !member.everEdited)) {
    signals.push('MEMBER_NEVER_EDITED');
  }

  if (
    editing &&
    team.delivery === 'pending' &&
    team.lastReturnedAt !== null &&
    daysToDeadline >= 0 &&
    daysToDeadline <= riskThresholds.deadlineDays &&
    team.lastEditedAt <= team.lastReturnedAt
  ) {
    signals.push('DEADLINE_NEAR_WITHOUT_CHANGE');
  }

  return signals;
}

export type CourseEvent = {
  concluded: number;
  deliveredCurrent: number;
  id: string;
  name: string;
  schedule: Array<{ deadline: string; name: string }>;
  scope: 'course' | 'class' | 'institution';
  teams: TeamWithSignals[];
  withSignal: number;
};

/** Participação registrada de cada integrante (RF-ACP-004). */
export type TeamContribution = {
  /** Texto majoritariamente importado: nada se afirma sobre a divisão do trabalho (E1). */
  imported: boolean;
  members: Array<{
    messages: number;
    name: string;
    remarksAddressed: number;
    sessions: number;
    textShare: number;
  }>;
  teamId: string;
  teamName: string;
};

/** Relatório de produção do curso (RF-ACP-005). Apuração do que foi registrado. */
export type CourseReport = {
  articleGradeAverage: number | null;
  concluded: number;
  course: string;
  events: Array<{ name: string; teams: number }>;
  externalPublications: number;
  generatedAt: string;
  individualGradeAverage: number | null;
  lagging: Array<{ event: string; milestone: string; team: string }>;
  notConcluded: number;
  period: string;
  students: number;
};

/** Períodos do calendário do curso, delimitados pelos seus eventos (RF-ACP-005 RN4). */
export const reportPeriods = ['2026.2', '2026.1', '2025.2'];

export function isEmptyReport(report: CourseReport) {
  return report.events.length === 0;
}

function escapeCsv(value: string) {
  return /[";\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Serializa as linhas apresentadas na tela, sem acrescentar nem omitir dado (RF-ACP-006 RN1). */
export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsv).join(';')).join('\r\n');
}
