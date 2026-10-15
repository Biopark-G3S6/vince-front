import { useState, type FormEvent } from 'react';

import { useTranslation } from 'react-i18next';

import { currentArticle } from '@features/articles';
import { useFormatters } from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import {
  Button,
  CheckIcon,
  ChevronRightIcon,
  EditIcon,
  Notice,
  ReplyIcon,
  SectionPanel,
  StatusBadge,
  UndoIcon,
  type BadgeTone,
} from '@shared/ui';

import {
  useCreateRemark,
  useDecideRemark,
  useReplyToRemark,
  useSetRemarkAddressed,
  useUpdateRemark,
} from '../api/hooks';
import { diffWords } from '../model/diff';
import {
  currentParagraphs,
  findMilestone,
  isPending,
  type Remark,
  type RemarkState,
  type ReviewCycle,
} from '../model/review';

import { DiffText } from './DiffText';
import type { RemarkDraft } from './DocumentView';
import { useFeedback } from './useFeedback';

const stateTone: Record<RemarkState, BadgeTone> = {
  ADDRESSED: 'primary',
  DISMISSED: 'muted',
  OPEN: 'warning',
  RESOLVED: 'success',
};

type RemarkPanelProps = {
  cycle: ReviewCycle;
  draft: RemarkDraft | null;
  isAdvisor: boolean;
  onDiscardDraft: () => void;
  onSelect: (remarkId: string | null) => void;
  selectedRemarkId: string | null;
};

export function RemarkPanel({
  cycle,
  draft,
  isAdvisor,
  onDiscardDraft,
  onSelect,
  selectedRemarkId,
}: RemarkPanelProps) {
  const { t } = useTranslation('review');
  const pending = cycle.remarks.filter(isPending);
  const closed = cycle.remarks.filter((remark) => !isPending(remark));

  const renderList = (remarks: Remark[]) => (
    <ul className="mt-3 space-y-3">
      {remarks.map((remark) => (
        <li key={remark.id}>
          <RemarkCard
            cycle={cycle}
            isAdvisor={isAdvisor}
            onToggle={() => onSelect(selectedRemarkId === remark.id ? null : remark.id)}
            open={selectedRemarkId === remark.id}
            remark={remark}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <SectionPanel className="self-start" title={t('remarks.title')}>
      {draft && <NewRemarkForm draft={draft} onDone={onDiscardDraft} />}

      {cycle.remarks.length === 0 && !draft && (
        <p className="text-vince-muted">
          {isAdvisor ? t('remarks.empty') : t('remarks.emptyStudent')}
        </p>
      )}

      {pending.length > 0 && (
        <section className={cn(draft && 'mt-6')}>
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
            {t('remarks.pending')} ({pending.length})
          </h3>
          {renderList(pending)}
        </section>
      )}

      {closed.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
            {t('remarks.closed')} ({closed.length})
          </h3>
          {renderList(closed)}
        </section>
      )}
    </SectionPanel>
  );
}

function NewRemarkForm({ draft, onDone }: { draft: RemarkDraft; onDone: () => void }) {
  const { t } = useTranslation('review');
  const createRemark = useCreateRemark();
  const feedback = useFeedback();
  const [text, setText] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    createRemark.mutate(
      { ...draft, text },
      {
        onError: feedback.onError,
        onSuccess: () => {
          feedback.success('remarkCreated')();
          onDone();
        },
      },
    );
  }

  return (
    <form
      className="rounded-lg border-2 border-vince-primary bg-vince-surface p-4"
      onSubmit={handleSubmit}
    >
      <h3 className="font-extrabold text-vince-text">{t('remarks.newTitle')}</h3>
      <p className="mt-3 text-sm font-semibold text-vince-muted">{t('remarks.newQuote')}</p>
      <blockquote className="mt-1 border-l-4 border-vince-primary pl-3 text-sm italic leading-6 text-vince-text">
        “{draft.quote}”
      </blockquote>
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-vince-muted">
          {t('remarks.newLabel')}
        </span>
        <textarea
          autoFocus
          className="min-h-24 w-full rounded-lg border border-vince-border bg-white p-3 text-vince-text focus:border-vince-primary"
          onChange={(event) => setText(event.target.value)}
          placeholder={t('remarks.newPlaceholder')}
          value={text}
        />
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={onDone} size="sm" variant="ghost">
          {t('actions.cancel')}
        </Button>
        <Button disabled={createRemark.isPending} size="sm" type="submit">
          {t('remarks.create')}
        </Button>
      </div>
    </form>
  );
}

type RemarkCardProps = {
  cycle: ReviewCycle;
  isAdvisor: boolean;
  onToggle: () => void;
  open: boolean;
  remark: Remark;
};

function RemarkCard({ cycle, isAdvisor, onToggle, open, remark }: RemarkCardProps) {
  const { t } = useTranslation('review');
  const { formatDateTime } = useFormatters();
  const lastChange = remark.history[remark.history.length - 1];

  return (
    <article
      className={cn(
        'rounded-lg border bg-white',
        open ? 'border-vince-primary shadow-sm' : 'border-vince-border',
      )}
      id={`apontamento-${remark.id}`}
    >
      <button
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <ChevronRightIcon
          className={cn('mt-1 h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge label={t(`remarkState.${remark.state}`)} tone={stateTone[remark.state]} />
            {!remark.published && (
              <span className="text-xs font-semibold text-vince-muted">
                {t('remarks.unpublished')}
              </span>
            )}
          </span>
          <span className="mt-2 block truncate text-sm italic text-vince-muted">
            “{remark.quote}”
          </span>
          <span className="mt-1 block leading-6 text-vince-text">{remark.text}</span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-vince-border p-4">
          <Confrontation cycle={cycle} remark={remark} />

          <p className="text-sm text-vince-muted">
            {t('remarks.origin', {
              milestone: findMilestone(cycle, remark.milestoneId)?.name ?? '',
            })}
            {' · '}
            {currentArticle.advisor.name}
            {' · '}
            {formatDateTime(remark.createdAt)}
          </p>

          {lastChange && (
            <details className="text-sm text-vince-muted">
              <summary className="cursor-pointer font-semibold">
                {t('remarks.edited', { date: formatDateTime(lastChange.changedAt) })}
              </summary>
              <ul className="mt-2 space-y-1 border-l-2 border-vince-border pl-3">
                {remark.history.map((entry) => (
                  <li key={entry.changedAt}>
                    <span className="font-semibold">{t('remarks.history')}:</span> {entry.text}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {remark.decision && (
            <p className="text-sm font-semibold text-vince-muted">
              {t('remarks.decidedBy', {
                date: formatDateTime(remark.decision.at),
                decision: t(`decision.${remark.decision.kind}`),
                name: currentArticle.advisor.name,
              })}
            </p>
          )}

          {remark.replyMessageIds.length > 0 && (
            <a
              className="block text-sm font-semibold text-vince-primary underline"
              href={`/admin/discussao#mensagem-${remark.replyMessageIds[remark.replyMessageIds.length - 1]}`}
            >
              {t('remarks.viewReplies', { count: remark.replyMessageIds.length })}
            </a>
          )}

          {isAdvisor ? (
            <AdvisorActions cycle={cycle} remark={remark} />
          ) : (
            <StudentActions cycle={cycle} remark={remark} />
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Confronto entre o trecho de origem e o estado atual. Aparece apenas com o
 * apontamento aberto, para não poluir a leitura do documento (RF-REV-009 RN1).
 */
function Confrontation({ cycle, remark }: { cycle: ReviewCycle; remark: Remark }) {
  const { t } = useTranslation('review');
  const origin = cycle.submissions
    .find((submission) => submission.id === remark.submissionId)
    ?.paragraphs.find((paragraph) => paragraph.id === remark.paragraphId);
  const current = currentParagraphs(cycle).find((paragraph) => paragraph.id === remark.paragraphId);

  if (!origin) {
    return null;
  }

  const segments = current ? diffWords(origin.text, current.text) : [];

  return (
    <div className="space-y-3">
      <figure className="rounded-lg border border-red-200 bg-red-50 p-3">
        <figcaption className="text-xs font-bold uppercase tracking-[0.06em] text-red-800">
          {t('confront.before')}
        </figcaption>
        <p className="mt-1 text-sm leading-6 text-vince-text">
          {current ? <DiffText segments={segments} side="before" /> : origin.text}
        </p>
      </figure>
      <figure className="rounded-lg border border-green-200 bg-green-50 p-3">
        <figcaption className="text-xs font-bold uppercase tracking-[0.06em] text-green-800">
          {t('confront.after')}
        </figcaption>
        {current ? (
          <p className="mt-1 text-sm leading-6 text-vince-text">
            <DiffText segments={segments} side="after" />
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-vince-text">{t('confront.removed')}</p>
        )}
      </figure>
      {current && current.text === origin.text && (
        <p className="text-sm font-semibold text-vince-muted">{t('confront.unchanged')}</p>
      )}
    </div>
  );
}

function AdvisorActions({ cycle, remark }: { cycle: ReviewCycle; remark: Remark }) {
  const { t } = useTranslation('review');
  const decideRemark = useDecideRemark();
  const updateRemark = useUpdateRemark();
  const feedback = useFeedback();
  const [editingText, setEditingText] = useState<string | null>(null);

  if (!isPending(remark)) {
    return null;
  }

  // A validação ocorre apenas durante a correção, sobre apontamento já devolvido.
  const canDecide = cycle.status === 'IN_REVIEW' && remark.published;

  const decide = (decision: 'RESOLVED' | 'REOPENED' | 'DISMISSED') =>
    decideRemark.mutate(
      { decision, remarkId: remark.id },
      { onError: feedback.onError, onSuccess: feedback.success('remarkDecided') },
    );

  if (editingText !== null) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateRemark.mutate(
            { remarkId: remark.id, text: editingText },
            {
              onError: feedback.onError,
              onSuccess: () => {
                feedback.success('remarkUpdated')();
                setEditingText(null);
              },
            },
          );
        }}
      >
        <label>
          <span className="mb-1 block text-sm font-semibold text-vince-muted">
            {t('remarks.editLabel')}
          </span>
          <textarea
            className="min-h-24 w-full rounded-lg border border-vince-border p-3 text-vince-text focus:border-vince-primary"
            onChange={(event) => setEditingText(event.target.value)}
            value={editingText}
          />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <Button onClick={() => setEditingText(null)} size="sm" variant="ghost">
            {t('actions.cancel')}
          </Button>
          <Button disabled={updateRemark.isPending} size="sm" type="submit">
            {t('actions.save')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {canDecide && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button disabled={decideRemark.isPending} onClick={() => decide('RESOLVED')} size="sm">
              <CheckIcon className="h-4 w-4" />
              {t('remarks.validate')}
            </Button>
            {remark.state === 'ADDRESSED' && (
              <Button
                disabled={decideRemark.isPending}
                onClick={() => decide('REOPENED')}
                size="sm"
                variant="outline"
              >
                <UndoIcon className="h-4 w-4" />
                {t('remarks.reopen')}
              </Button>
            )}
            <Button
              disabled={decideRemark.isPending}
              onClick={() => decide('DISMISSED')}
              size="sm"
              variant="outline"
            >
              {t('remarks.dismiss')}
            </Button>
          </div>
          <p className="text-sm text-vince-muted">{t('remarks.decisionHint')}</p>
        </>
      )}
      <Button onClick={() => setEditingText(remark.text)} size="sm" variant="ghost">
        <EditIcon className="h-4 w-4" />
        {t('remarks.editText')}
      </Button>
    </div>
  );
}

function StudentActions({ cycle, remark }: { cycle: ReviewCycle; remark: Remark }) {
  const { t } = useTranslation('review');
  const setAddressed = useSetRemarkAddressed();
  const replyToRemark = useReplyToRemark();
  const feedback = useFeedback();
  const [reply, setReply] = useState<string | null>(null);
  const editable = cycle.status === 'IN_PROGRESS' && isPending(remark);

  const toggleAddressed = (addressed: boolean) =>
    setAddressed.mutate(
      { addressed, remarkId: remark.id },
      {
        onError: feedback.onError,
        onSuccess: feedback.success(addressed ? 'remarkAddressed' : 'remarkUnmarked'),
      },
    );

  return (
    <div className="space-y-3">
      {remark.state === 'ADDRESSED' && <Notice>{t('remarks.awaitingValidation')}</Notice>}

      <div className="flex flex-wrap gap-2">
        {editable && remark.state === 'OPEN' && (
          <Button disabled={setAddressed.isPending} onClick={() => toggleAddressed(true)} size="sm">
            <CheckIcon className="h-4 w-4" />
            {t('remarks.markAddressed')}
          </Button>
        )}
        {editable && remark.state === 'ADDRESSED' && (
          <Button
            disabled={setAddressed.isPending}
            onClick={() => toggleAddressed(false)}
            size="sm"
            variant="outline"
          >
            <UndoIcon className="h-4 w-4" />
            {t('remarks.unmarkAddressed')}
          </Button>
        )}
        {reply === null && (
          <Button onClick={() => setReply('')} size="sm" variant="ghost">
            <ReplyIcon className="h-4 w-4" />
            {t('remarks.reply')}
          </Button>
        )}
      </div>

      {reply !== null && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            replyToRemark.mutate(
              { body: reply, remarkId: remark.id },
              {
                onError: feedback.onError,
                onSuccess: () => {
                  feedback.success('replied')();
                  setReply(null);
                },
              },
            );
          }}
        >
          <label>
            <span className="mb-1 block text-sm font-semibold text-vince-muted">
              {t('remarks.replyLabel')}
            </span>
            <textarea
              className="min-h-20 w-full rounded-lg border border-vince-border p-3 text-vince-text focus:border-vince-primary"
              onChange={(event) => setReply(event.target.value)}
              placeholder={t('remarks.replyPlaceholder')}
              value={reply}
            />
          </label>
          <p className="mt-1 text-sm text-vince-muted">{t('remarks.replyHint')}</p>
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={() => setReply(null)} size="sm" variant="ghost">
              {t('actions.cancel')}
            </Button>
            <Button disabled={replyToRemark.isPending} size="sm" type="submit">
              {t('remarks.sendReply')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
