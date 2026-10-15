import { currentArticle, type TeamMember } from '@features/articles';

/**
 * Participam da discussão os integrantes da equipe e o orientador responsável por ela
 * (RF-DSC-001 RN2).
 */
export function participants(): TeamMember[] {
  return [currentArticle.advisor, ...currentArticle.members];
}

export function findParticipant(userId: string) {
  return participants().find((participant) => participant.id === userId);
}

export type RemarkReference = {
  excerpt: string;
  id: string;
};

export type DiscussionMessage = {
  authorId: string;
  body: string;
  createdAt: string;
  /** A mensagem excluída permanece registrada, sem o conteúdo (RF-DSC-001 RN5). */
  deleted: boolean;
  id: string;
  /** Mensagem raiz; há um único nível de resposta (RF-DSC-002 RN1). */
  parentId: string | null;
  remarkRef: RemarkReference | null;
};

export type DiscussionThread = {
  replies: DiscussionMessage[];
  root: DiscussionMessage;
};

export function groupThreads(messages: DiscussionMessage[]): DiscussionThread[] {
  const byDate = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return byDate
    .filter((message) => message.parentId === null)
    .map((root) => ({
      replies: byDate.filter((message) => message.parentId === root.id),
      root,
    }));
}

/** Fatos que geram notificação (RF-DSC-005 RN1, RF-ACP-003). */
export const notificationTypes = [
  'SUBMISSION_DELIVERED',
  'SUBMISSION_AUTO_CLOSED',
  'ARTICLE_RETURNED',
  'MESSAGE_POSTED',
  'REMARK_UPDATED',
  'REMARK_DECIDED',
  'ARTICLE_CONCLUDED',
  'DEADLINE_APPROACHING',
  'TEAM_AT_RISK',
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type AppNotification = {
  createdAt: string;
  /** Destino da navegação até o objeto da notificação. */
  href: string;
  id: string;
  /** Valores interpolados na mensagem traduzida no cliente (ADR-0026 §16). */
  params: Record<string, string>;
  read: boolean;
  recipientId: string;
  type: NotificationType;
};

export type EmailPreferences = Record<NotificationType, boolean>;
