import { articleHref, currentArticle, DEMO_ARTICLE_ID } from '@features/articles';
import { ApiError } from '@shared/api/apiError';
import { createId, createMockCollection, respond } from '@shared/api/mockDb';

import {
  findParticipant,
  participants,
  notificationTypes,
  type AppNotification,
  type DiscussionMessage,
  type EmailPreferences,
  type NotificationType,
  type RemarkReference,
} from '../model/discussion';

/**
 * Backend simulado da discussão e das notificações. Substituível pelo cliente HTTP
 * sem alteração das telas: os componentes só o alcançam pelos hooks (ADR-0017 §6).
 */

type MessagesDb = { messages: DiscussionMessage[] };

/** As notificações são do usuário, não do artigo: uma só coleção para todas. */
type NotificationsDb = {
  emailPreferences: Record<string, EmailPreferences>;
  notifications: AppNotification[];
};

const demoParams = { article: 'Análise de Redes Neurais em Saúde', team: 'Equipe Alpha' };

function articleParams() {
  return { article: currentArticle.title, team: currentArticle.team };
}

const demoMessages: DiscussionMessage[] = [
  {
    authorId: 'user-almeida',
    body: 'Pessoal, devolvi a primeira etapa com três apontamentos. O mais importante é o da hipótese central: ela precisa aparecer já na introdução.',
    createdAt: '2026-09-18T13:10:00.000Z',
    deleted: false,
    id: 'message-1',
    parentId: null,
    remarkRef: null,
  },
  {
    authorId: 'user-maria',
    body: 'Combinado, professor. Reescrevi o segundo parágrafo da introdução; pode conferir se a hipótese ficou clara?',
    createdAt: '2026-09-21T18:42:00.000Z',
    deleted: false,
    id: 'message-2',
    parentId: 'message-1',
    remarkRef: {
      excerpt: 'quando treinados com bases de dados heterogêneas.',
      id: 'remark-1',
    },
  },
  {
    authorId: 'user-joao',
    body: 'Sobre a base de dados: conseguimos acesso a dois centros hospitalares, não três. Vale ajustar a metodologia ou manter a previsão original?',
    createdAt: '2026-10-02T14:05:00.000Z',
    deleted: false,
    id: 'message-3',
    parentId: null,
    remarkRef: null,
  },
  {
    authorId: 'user-almeida',
    body: 'Ajustem a metodologia e registrem a limitação. Dois centros são suficientes, desde que a heterogeneidade dos dados fique descrita.',
    createdAt: '2026-10-02T19:30:00.000Z',
    deleted: false,
    id: 'message-4',
    parentId: 'message-3',
    remarkRef: null,
  },
];

/** A discussão é única por artigo (RF-DSC-001 RN1): uma coleção para cada um. */
function messagesDb() {
  const articleId = currentArticle.id;

  return createMockCollection<MessagesDb>(`discussion.${articleId}`, () => ({
    messages: articleId === DEMO_ARTICLE_ID ? demoMessages : [],
  }));
}

const notificationsDb = createMockCollection<NotificationsDb>('notifications', () => ({
  emailPreferences: {},
  notifications: [
    {
      createdAt: '2026-10-09T11:00:00.000Z',
      href: '/admin/acompanhamento',
      id: 'notification-2',
      params: { article: 'Impacto Ambiental Urbano em Projetos Locais', team: 'Equipe Beta' },
      read: false,
      recipientId: 'user-almeida',
      type: 'TEAM_AT_RISK',
    },
    {
      createdAt: '2026-10-02T14:05:00.000Z',
      href: '/admin/discussao#mensagem-message-3',
      id: 'notification-3',
      params: { ...demoParams, actor: 'João Pedro Silva' },
      read: true,
      recipientId: 'user-almeida',
      type: 'MESSAGE_POSTED',
    },
    {
      createdAt: '2026-10-08T12:00:00.000Z',
      href: '/admin/correcao',
      id: 'notification-4',
      params: { ...demoParams, milestone: 'Referencial teórico' },
      read: false,
      recipientId: 'user-joao',
      type: 'DEADLINE_APPROACHING',
    },
    {
      createdAt: '2026-10-02T19:30:00.000Z',
      href: '/admin/discussao#mensagem-message-4',
      id: 'notification-5',
      params: { ...demoParams, actor: 'Prof. Almeida' },
      read: false,
      recipientId: 'user-joao',
      type: 'MESSAGE_POSTED',
    },
    {
      createdAt: '2026-09-18T13:05:00.000Z',
      href: '/admin/correcao',
      id: 'notification-6',
      params: { ...demoParams, actor: 'Prof. Almeida', milestone: 'Projeto de pesquisa' },
      read: true,
      recipientId: 'user-joao',
      type: 'ARTICLE_RETURNED',
    },
    {
      createdAt: '2026-10-09T11:00:00.000Z',
      href: '/admin/acompanhamento',
      id: 'notification-7',
      params: { article: 'Impacto Ambiental Urbano em Projetos Locais', team: 'Equipe Beta' },
      read: false,
      recipientId: 'user-ricardo',
      type: 'TEAM_AT_RISK',
    },
  ],
}));

function assertParticipant(actorId: string) {
  // Quem não tem vínculo com a equipe não alcança a discussão (RF-DSC-001 E1).
  if (!findParticipant(actorId)) {
    throw new ApiError('RESOURCE_NOT_FOUND');
  }
}

function pushNotifications(
  draft: NotificationsDb,
  input: Omit<NotifyInput, 'recipientIds'> & { recipientIds: string[] },
) {
  input.recipientIds
    // O usuário não é notificado do que ele mesmo fez (RF-DSC-005 RN2).
    .filter((recipientId) => recipientId !== input.actorId)
    .forEach((recipientId) => {
      draft.notifications.push({
        createdAt: new Date().toISOString(),
        href: input.href,
        id: createId('notification'),
        params: input.params,
        read: false,
        recipientId,
        type: input.type,
      });
    });
}

export type NotifyInput = {
  /** Quem originou o fato; ausente quando o ator é o sistema. */
  actorId?: string;
  href: string;
  params: Record<string, string>;
  recipientIds: string[];
  type: NotificationType;
};

/** Registra a notificação de um fato de outra feature (RF-DSC-005). */
export function notify(input: NotifyInput) {
  return respond(() => {
    notificationsDb.update((draft) => pushNotifications(draft, input));
  });
}

export function listMessages(actorId: string) {
  return respond(() => {
    assertParticipant(actorId);
    return messagesDb().read().messages;
  });
}

export type PostMessageInput = {
  actorId: string;
  body: string;
  parentId?: string | null;
  remarkRef?: RemarkReference | null;
};

export function postMessage({
  actorId,
  body,
  parentId = null,
  remarkRef = null,
}: PostMessageInput) {
  return respond(() => {
    assertParticipant(actorId);

    const text = body.trim();

    if (!text) {
      throw new ApiError('VALIDATION_FAILED');
    }

    let created: DiscussionMessage | undefined;

    messagesDb().update((draft) => {
      const parent = draft.messages.find((message) => message.id === parentId);

      created = {
        authorId: actorId,
        body: text,
        createdAt: new Date().toISOString(),
        deleted: false,
        id: createId('message'),
        // A resposta a uma resposta se prende à mesma mensagem raiz (RF-DSC-002 RN1).
        parentId: parent ? (parent.parentId ?? parent.id) : null,
        remarkRef,
      };
      draft.messages.push(created);
    });

    notificationsDb.update((draft) =>
      pushNotifications(draft, {
        actorId,
        href: articleHref(`/admin/discussao#mensagem-${created!.id}`),
        params: { ...articleParams(), actor: findParticipant(actorId)?.name ?? '' },
        recipientIds: participants().map((participant) => participant.id),
        type: 'MESSAGE_POSTED',
      }),
    );

    return created!;
  });
}

export function deleteMessage(actorId: string, messageId: string) {
  return respond(() => {
    assertParticipant(actorId);

    messagesDb().update((draft) => {
      const message = draft.messages.find((candidate) => candidate.id === messageId);

      if (!message) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }

      if (message.authorId !== actorId) {
        throw new ApiError('PERMISSION_DENIED');
      }

      message.deleted = true;
      message.body = '';
    });
  });
}

/** Mensagens de um participante, por autor — insumo do quadro de contribuição. */
export function countMessagesByAuthor() {
  return respond(() => {
    const counts: Record<string, number> = {};

    messagesDb()
      .read()
      .messages.filter((message) => !message.deleted)
      .forEach((message) => {
        counts[message.authorId] = (counts[message.authorId] ?? 0) + 1;
      });

    return counts;
  });
}

export function listNotifications(userId: string) {
  return respond(() =>
    notificationsDb
      .read()
      // O usuário só alcança as notificações endereçadas a ele (RF-DSC-006 RN1).
      .notifications.filter((notification) => notification.recipientId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export function markNotificationRead(userId: string, notificationId: string) {
  return respond(() => {
    notificationsDb.update((draft) => {
      const notification = draft.notifications.find(
        (candidate) => candidate.id === notificationId && candidate.recipientId === userId,
      );

      if (!notification) {
        throw new ApiError('RESOURCE_NOT_FOUND');
      }

      notification.read = true;
    });
  });
}

export function markAllNotificationsRead(userId: string) {
  return respond(() => {
    notificationsDb.update((draft) => {
      draft.notifications
        .filter((notification) => notification.recipientId === userId)
        .forEach((notification) => {
          notification.read = true;
        });
    });
  });
}

function defaultEmailPreferences(): EmailPreferences {
  return Object.fromEntries(notificationTypes.map((type) => [type, false])) as EmailPreferences;
}

export function getEmailPreferences(userId: string) {
  return respond(
    () => notificationsDb.read().emailPreferences[userId] ?? defaultEmailPreferences(),
  );
}

export function setEmailPreference(userId: string, type: NotificationType, enabled: boolean) {
  return respond(() => {
    notificationsDb.update((draft) => {
      const current = draft.emailPreferences[userId] ?? defaultEmailPreferences();
      draft.emailPreferences[userId] = { ...current, [type]: enabled };
    });
  });
}
