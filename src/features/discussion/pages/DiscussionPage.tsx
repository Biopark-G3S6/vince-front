import { useEffect, useState, type FormEvent } from 'react';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PageScaffold, useCurrentUser } from '@features/admin';
import { articleHref, currentArticle } from '@features/articles';
import { getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import {
  Button,
  ChatIcon,
  EmptyState,
  LockIcon,
  Notice,
  ReplyIcon,
  SectionPanel,
  SendIcon,
  TrashIcon,
} from '@shared/ui';

import { useDeleteMessage, useMessages, usePostMessage } from '../api/hooks';
import {
  findParticipant,
  groupThreads,
  participants,
  type DiscussionMessage,
  type DiscussionThread,
} from '../model/discussion';

export function DiscussionPage() {
  const { t } = useTranslation('discussion');
  const user = useCurrentUser();
  const messages = useMessages();
  const threads = groupThreads(messages.data ?? []);

  // A notificação leva até a mensagem que a originou.
  useEffect(() => {
    if (messages.data && window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'center' });
    }
  }, [messages.data]);

  return (
    <PageScaffold
      activeSection="discussion"
      description={t('discussion.description')}
      eyebrow={t('discussion.eyebrow')}
      personaRoles={['advisor', 'student', 'coordinator']}
      title={t('discussion.title')}
    >
      {messages.isError ? (
        <div className="mt-8">
          <EmptyState
            description={t('discussion.noAccessBody')}
            icon={<LockIcon className="h-8 w-8" />}
            title={t('discussion.noAccessTitle')}
          />
        </div>
      ) : (
        <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <article className="rounded-lg border border-vince-border bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
                {t('discussion.articleLabel')}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-vince-text">
                {currentArticle.title}
              </h2>
              <p className="mt-1 text-vince-muted">
                {currentArticle.team} · {currentArticle.event}
              </p>
              <Notice className="mt-4">{t('discussion.alwaysOpen')}</Notice>
            </article>

            {threads.length === 0 && !messages.isPending ? (
              <EmptyState
                description={t('discussion.emptyHint')}
                icon={<ChatIcon className="h-8 w-8" />}
                title={t('discussion.empty')}
              />
            ) : (
              <ol className="space-y-5">
                {threads.map((thread) => (
                  <li key={thread.root.id}>
                    <ThreadCard currentUserId={user.id} thread={thread} />
                  </li>
                ))}
              </ol>
            )}

            <Composer />
          </div>

          <aside className="space-y-6">
            <SectionPanel title={t('discussion.participants')}>
              <ul className="space-y-4">
                {participants().map((participant) => (
                  <li className="flex items-center gap-3" key={participant.id}>
                    <Avatar initials={participant.initials} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-vince-text">
                        {participant.name}
                        {participant.id === user.id && (
                          <span className="font-normal text-vince-muted">
                            {' '}
                            ({t('discussion.you')})
                          </span>
                        )}
                      </p>
                      {participant.id === currentArticle.advisor.id && (
                        <p className="text-sm text-vince-muted">{t('discussion.advisorTag')}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-6 text-vince-muted">
                {t('discussion.participantsHint')}
              </p>
            </SectionPanel>

            <div className="rounded-lg border border-vince-border bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 font-semibold text-vince-text">
                <span className="h-2.5 w-2.5 rounded-full bg-vince-success" />
                {t('discussion.liveOn')}
              </p>
              <p className="mt-2 text-sm leading-6 text-vince-muted">{t('discussion.liveHint')}</p>
            </div>
          </aside>
        </section>
      )}
    </PageScaffold>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd9df] text-sm font-bold text-vince-primary">
      {initials}
    </span>
  );
}

function ThreadCard({
  currentUserId,
  thread,
}: {
  currentUserId: string;
  thread: DiscussionThread;
}) {
  const { t } = useTranslation('discussion');
  const [replying, setReplying] = useState(false);
  const rootAuthor = findParticipant(thread.root.authorId);

  return (
    <article className="rounded-lg border border-vince-border bg-white shadow-sm">
      <div className="p-5">
        <MessageBody
          currentUserId={currentUserId}
          deletedLabel={t('discussion.rootDeleted')}
          message={thread.root}
        />
      </div>

      {thread.replies.length > 0 && (
        <div className="border-t border-vince-border bg-vince-surface px-5 py-4">
          <p className="mb-3 text-sm font-semibold text-vince-muted">
            {t('discussion.replyCount', { count: thread.replies.length })}
          </p>
          <ol className="space-y-4 border-l-2 border-vince-border pl-4">
            {thread.replies.map((reply) => (
              <li key={reply.id}>
                <MessageBody
                  currentUserId={currentUserId}
                  deletedLabel={t('discussion.deleted')}
                  message={reply}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="border-t border-vince-border px-5 py-3">
        {replying ? (
          <Composer
            onDone={() => setReplying(false)}
            parentId={thread.root.id}
            replyingTo={rootAuthor?.name}
          />
        ) : (
          <Button onClick={() => setReplying(true)} size="sm" variant="ghost">
            <ReplyIcon className="h-4 w-4" />
            {t('discussion.reply')}
          </Button>
        )}
      </div>
    </article>
  );
}

type MessageBodyProps = {
  currentUserId: string;
  deletedLabel: string;
  message: DiscussionMessage;
};

function MessageBody({ currentUserId, deletedLabel, message }: MessageBodyProps) {
  const { t } = useTranslation('discussion');
  const { formatDateTime } = useFormatters();
  const deleteMessage = useDeleteMessage();
  const author = findParticipant(message.authorId);
  const highlighted = window.location.hash === `#mensagem-${message.id}`;

  function handleDelete() {
    deleteMessage.mutate(message.id, {
      onError: (error) => toast.error(t(`errors.${getErrorCode(error)}`)),
      onSuccess: () => toast.success(t('discussion.removed')),
    });
  }

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg',
        highlighted && 'bg-vince-tertiary p-3 outline outline-2 outline-vince-border',
      )}
      id={`mensagem-${message.id}`}
    >
      <Avatar initials={author?.initials ?? '?'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-bold text-vince-text">{author?.name}</p>
          {message.authorId === currentArticle.advisor.id && (
            <span className="rounded-full bg-vince-tertiary px-2 py-0.5 text-xs font-bold uppercase text-vince-primary">
              {t('discussion.advisorTag')}
            </span>
          )}
          <time className="text-sm text-vince-muted" dateTime={message.createdAt}>
            {formatDateTime(message.createdAt)}
          </time>
        </div>

        {message.remarkRef && !message.deleted && (
          <a
            className="mt-2 block rounded-lg border-l-4 border-vince-primary bg-vince-tertiary px-3 py-2 text-sm hover:bg-[#ead8dc]"
            href={articleHref(`/admin/correcao?apontamento=${message.remarkRef.id}`)}
          >
            <span className="font-bold text-vince-primary">{t('discussion.remarkReference')}</span>
            <span className="mt-0.5 block truncate italic text-vince-muted">
              “{message.remarkRef.excerpt}”
            </span>
            <span className="mt-1 block font-semibold text-vince-primary underline">
              {t('discussion.openRemark')}
            </span>
          </a>
        )}

        {message.deleted ? (
          <p className="mt-2 italic text-vince-muted">{deletedLabel}</p>
        ) : (
          <p className="mt-2 whitespace-pre-wrap leading-7 text-vince-text">{message.body}</p>
        )}

        {!message.deleted && message.authorId === currentUserId && (
          <button
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-vince-muted hover:text-red-700"
            disabled={deleteMessage.isPending}
            onClick={handleDelete}
            type="button"
          >
            <TrashIcon className="h-4 w-4" />
            {t('discussion.delete')}
          </button>
        )}
      </div>
    </div>
  );
}

type ComposerProps = {
  onDone?: () => void;
  parentId?: string;
  replyingTo?: string;
};

function Composer({ onDone, parentId, replyingTo }: ComposerProps) {
  const { t } = useTranslation('discussion');
  const postMessage = usePostMessage();
  const [body, setBody] = useState('');
  const isReply = parentId !== undefined;
  const label = isReply
    ? t('discussion.replyLabel', { name: replyingTo ?? '' })
    : t('discussion.composerLabel');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    postMessage.mutate(
      { body, parentId },
      {
        onError: (error) => toast.error(t(`errors.${getErrorCode(error)}`)),
        onSuccess: () => {
          setBody('');
          toast.success(t('discussion.published'));
          onDone?.();
        },
      },
    );
  }

  return (
    <form
      className={cn(!isReply && 'rounded-lg border border-vince-border bg-white p-5 shadow-sm')}
      onSubmit={handleSubmit}
    >
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-vince-muted">{label}</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-vince-border p-3 text-vince-text focus:border-vince-primary"
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            isReply ? t('discussion.replyPlaceholder') : t('discussion.composerPlaceholder')
          }
          value={body}
        />
      </label>
      <div className="mt-3 flex justify-end gap-2">
        {isReply && (
          <Button onClick={onDone} size="sm" variant="ghost">
            {t('discussion.cancel')}
          </Button>
        )}
        <Button disabled={postMessage.isPending} size={isReply ? 'sm' : 'md'} type="submit">
          <SendIcon className="h-4 w-4" />
          {isReply ? t('discussion.sendReply') : t('discussion.publish')}
        </Button>
      </div>
    </form>
  );
}
