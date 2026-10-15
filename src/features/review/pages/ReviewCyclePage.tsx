import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { PageScaffold, useCurrentUser } from '@features/admin';
import { currentArticle } from '@features/articles';
import { useFormatters } from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import {
  Button,
  CalendarIcon,
  CheckIcon,
  ConfirmDialog,
  EmptyState,
  FlagIcon,
  GraduationCapIcon,
  LockIcon,
  Notice,
  SendIcon,
  Tabs,
  UndoIcon,
  UsersIcon,
  WarningIcon,
} from '@shared/ui';

import {
  useConcludeArticle,
  useDeliverMilestone,
  useReturnArticle,
  useReviewCycle,
  useUndoDelivery,
} from '../api/hooks';
import { DocumentView, type RemarkDraft } from '../components/DocumentView';
import { RemarkPanel } from '../components/RemarkPanel';
import { SubmissionHistory } from '../components/SubmissionHistory';
import { useFeedback } from '../components/useFeedback';
import { VersionComparison } from '../components/VersionComparison';
import {
  currentParagraphs,
  findMilestone,
  isLastMilestone,
  isPending,
  latestSubmission,
  statusPipeline,
  type ReviewCycle,
} from '../model/review';

type TabKey = 'correction' | 'compare' | 'submissions';
type ConfirmKey = 'deliver' | 'return' | 'conclude';

export function ReviewCyclePage() {
  const { t } = useTranslation('review');
  const cycle = useReviewCycle();

  return (
    <PageScaffold
      activeSection="review"
      description={t('page.description')}
      eyebrow={t('page.eyebrow')}
      personaRoles={['advisor', 'student']}
      title={t('page.title')}
    >
      {cycle.isError && (
        <div className="mt-8">
          <EmptyState
            description={t('page.noAccessBody')}
            icon={<LockIcon className="h-8 w-8" />}
            title={t('page.noAccessTitle')}
          />
        </div>
      )}
      {cycle.data && <ReviewWorkspace cycle={cycle.data} />}
    </PageScaffold>
  );
}

function ReviewWorkspace({ cycle }: { cycle: ReviewCycle }) {
  const { t } = useTranslation('review');
  const { formatDate, formatDateTime } = useFormatters();
  const user = useCurrentUser();
  const feedback = useFeedback();
  const isAdvisor = user.role === 'advisor';

  const deliver = useDeliverMilestone();
  const undo = useUndoDelivery();
  const returnArticle = useReturnArticle();
  const conclude = useConcludeArticle();

  const [tab, setTab] = useState<TabKey>('correction');
  const [confirm, setConfirm] = useState<ConfirmKey | null>(null);
  const [draft, setDraft] = useState<RemarkDraft | null>(null);
  // A notificação e a discussão levam direto ao apontamento.
  const [selectedRemarkId, setSelectedRemarkId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('apontamento'),
  );
  const latest = latestSubmission(cycle);
  const [comparedId, setComparedId] = useState<string | null>(null);
  const comparedSubmissionId = cycle.submissions.some((submission) => submission.id === comparedId)
    ? comparedId
    : (latest?.id ?? null);

  const milestone = findMilestone(cycle, cycle.currentMilestoneId);
  const inReview = cycle.status === 'IN_REVIEW';
  const inProgress = cycle.status === 'IN_PROGRESS';
  const pendingCount = cycle.remarks.filter(isPending).length;
  const unpublishedCount = cycle.remarks.filter((remark) => !remark.published).length;
  const selectedRemark = cycle.remarks.find((remark) => remark.id === selectedRemarkId);
  const editing = inProgress || cycle.status === 'STARTED';

  const confirmations: Record<
    ConfirmKey,
    { body: string; mutation: typeof deliver; success: string; title: string }
  > = {
    conclude: {
      body: t('confirm.concludeBody'),
      mutation: conclude,
      success: 'concluded',
      title: t('confirm.concludeTitle'),
    },
    deliver: {
      body: t('confirm.deliverBody'),
      mutation: deliver,
      success: 'delivered',
      title: t('confirm.deliverTitle', { milestone: milestone?.name ?? '' }),
    },
    return: {
      body: t('confirm.returnBody'),
      mutation: returnArticle,
      success: 'returned',
      title: t('confirm.returnTitle'),
    },
  };
  const activeConfirm = confirm ? confirmations[confirm] : null;

  function runConfirmed() {
    activeConfirm?.mutation.mutate(undefined, {
      onError: feedback.onError,
      onSettled: () => setConfirm(null),
      onSuccess: () => {
        feedback.success(activeConfirm.success)();
        setDraft(null);
      },
    });
  }

  return (
    <>
      <section className="mt-8 rounded-lg border border-vince-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-vince-text">{currentArticle.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-vince-muted">
              <span className="rounded-full border border-vince-primary bg-[#ff7c98] px-3 py-1 text-sm font-bold uppercase text-vince-primary">
                {t(`status.${cycle.status}`)}
              </span>
              <span className="inline-flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                {currentArticle.team}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {currentArticle.event}
              </span>
              <span className="inline-flex items-center gap-2">
                <GraduationCapIcon className="h-4 w-4" />
                {currentArticle.advisor.name}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isAdvisor && inProgress && (
              <Button onClick={() => setConfirm('deliver')}>
                <SendIcon className="h-5 w-5" />
                {t('actions.deliver')}
              </Button>
            )}
            {!isAdvisor && inReview && (
              <Button
                disabled={undo.isPending}
                onClick={() =>
                  undo.mutate(undefined, {
                    onError: feedback.onError,
                    onSuccess: feedback.success('undone'),
                  })
                }
                variant="outline"
              >
                <UndoIcon className="h-5 w-5" />
                {t('actions.undo')}
              </Button>
            )}
            {isAdvisor && inReview && (
              <>
                <Button onClick={() => setConfirm('return')} variant="outline">
                  <UndoIcon className="h-5 w-5" />
                  {t('actions.return')}
                </Button>
                {isLastMilestone(cycle) && (
                  <Button onClick={() => setConfirm('conclude')}>
                    <FlagIcon className="h-5 w-5" />
                    {t('actions.conclude')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <StatusStepper cycle={cycle} />

        <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
          {t('page.schedule')}
        </h3>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {cycle.milestones.map((item) => {
            const submission = cycle.submissions.find(
              (candidate) => candidate.milestoneId === item.id,
            );
            const isCurrent = item.id === cycle.currentMilestoneId;
            const state = submission?.returnedAt
              ? 'returned'
              : submission?.automatic
                ? 'automatic'
                : submission
                  ? 'delivered'
                  : isCurrent
                    ? 'current'
                    : 'upcoming';

            return (
              <li
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'rounded-lg border px-4 py-3',
                  isCurrent ? 'border-vince-primary bg-vince-tertiary' : 'border-vince-border',
                )}
                key={item.id}
              >
                <p className="font-bold text-vince-text">
                  {item.order}. {item.name}
                </p>
                <p className="mt-1 text-sm text-vince-muted">
                  {t('milestone.deadline', { date: formatDateTime(item.deadline) })}
                </p>
                <p
                  className={cn(
                    'mt-2 text-sm font-semibold',
                    state === 'automatic' ? 'text-red-800' : 'text-vince-primary',
                  )}
                >
                  {t(`milestone.${state}`)}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6 space-y-3">
        {cycle.status === 'FINISHED' && (
          <Notice icon={<CheckIcon className="h-5 w-5" />} tone="success">
            {t('banner.finished')}{' '}
            {isAdvisor && (
              <a className="font-bold underline" href="/admin/artigos">
                {t('banner.openEvaluation')}
              </a>
            )}
          </Notice>
        )}
        {inReview && latest?.automatic && isAdvisor && (
          <Notice icon={<WarningIcon className="h-5 w-5" />} tone="warning">
            {t('banner.automaticDelivery')}
          </Notice>
        )}
        {inReview && (
          <Notice>{t(isAdvisor ? 'banner.advisorInReview' : 'banner.studentInReview')}</Notice>
        )}
        {inProgress && isAdvisor && (
          <Notice>
            {t('banner.advisorInProgress')}{' '}
            <a className="font-bold underline" href="/admin/discussao">
              {t('banner.openDiscussion')}
            </a>
          </Notice>
        )}
        {inProgress && !isAdvisor && (
          <Notice>
            {t('banner.studentInProgress', {
              date: milestone ? formatDate(milestone.deadline) : '',
              milestone: milestone?.name ?? '',
            })}{' '}
            {pendingCount > 0 && t('banner.studentPendingRemarks', { count: pendingCount })}
          </Notice>
        )}
      </div>

      <div className="mt-8">
        <Tabs
          idPrefix="review"
          items={[
            { key: 'correction', label: t('tabs.correction') },
            { key: 'compare', label: t('tabs.compare') },
            { key: 'submissions', label: t('tabs.submissions') },
          ]}
          label={t('tabs.label')}
          onChange={setTab}
          value={tab}
        />

        <div
          aria-labelledby={`review-tab-${tab}`}
          className="pt-6"
          id={`review-panel-${tab}`}
          role="tabpanel"
        >
          {tab === 'correction' && (
            <div className="grid gap-6 2xl:grid-cols-[1fr_440px]">
              <div>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl font-extrabold text-vince-text">
                    {editing ? t('document.draftTitle') : t('document.title')}
                  </h3>
                  {!editing && latest && (
                    <p className="text-sm text-vince-muted">
                      {t('document.version', {
                        date: formatDateTime(latest.submittedAt),
                        milestone: findMilestone(cycle, latest.milestoneId)?.name ?? '',
                      })}
                    </p>
                  )}
                </div>
                {isAdvisor && inReview && (
                  <p className="mb-3 text-sm text-vince-muted">{t('document.selectionHint')}</p>
                )}
                <DocumentView
                  canAnnotate={isAdvisor && inReview}
                  canEdit={!isAdvisor && inProgress}
                  onAnnotate={setDraft}
                  onSelectRemark={setSelectedRemarkId}
                  paragraphs={currentParagraphs(cycle)}
                  remarks={cycle.remarks}
                  selectedRemark={selectedRemark}
                />
              </div>
              <RemarkPanel
                cycle={cycle}
                draft={isAdvisor && inReview ? draft : null}
                isAdvisor={isAdvisor}
                onDiscardDraft={() => setDraft(null)}
                onSelect={setSelectedRemarkId}
                selectedRemarkId={selectedRemarkId}
              />
            </div>
          )}

          {tab === 'compare' &&
            (comparedSubmissionId ? (
              <VersionComparison
                cycle={cycle}
                onSelect={setComparedId}
                submissionId={comparedSubmissionId}
              />
            ) : (
              <p className="text-vince-muted">{t('submissions.empty')}</p>
            ))}

          {tab === 'submissions' && (
            <SubmissionHistory
              cycle={cycle}
              onCompare={(submissionId) => {
                setComparedId(submissionId);
                setTab('compare');
              }}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        cancelLabel={t('actions.cancel')}
        confirmLabel={confirm ? t(`actions.${confirm}`) : ''}
        description={activeConfirm?.body ?? ''}
        onConfirm={runConfirmed}
        onOpenChange={(open) => !open && setConfirm(null)}
        open={confirm !== null}
        pending={activeConfirm?.mutation.isPending}
        title={activeConfirm?.title ?? ''}
      >
        {confirm === 'return' && (
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-vince-text">
            <li>
              {unpublishedCount > 0
                ? t('confirm.returnNew', { count: unpublishedCount })
                : t('confirm.returnNone')}
            </li>
            {pendingCount > 0 && <li>{t('confirm.returnPending', { count: pendingCount })}</li>}
          </ul>
        )}
      </ConfirmDialog>
    </>
  );
}

/** Situação do artigo, na mesma forma do protótipo de detalhes do artigo. */
function StatusStepper({ cycle }: { cycle: ReviewCycle }) {
  const { t } = useTranslation('review');
  const currentIndex = statusPipeline.indexOf(cycle.status);

  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-vince-muted">
        {t('page.progress')}
      </h3>
      <ol className="mt-4 grid grid-cols-4">
        {statusPipeline.map((status, index) => {
          const done = index < currentIndex || cycle.status === 'FINISHED';
          const current = index === currentIndex && !done;

          return (
            <li
              aria-current={index === currentIndex ? 'step' : undefined}
              className="relative text-center"
              key={status}
            >
              {index > 0 && (
                <span
                  className={cn(
                    'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                    index <= currentIndex ? 'bg-vince-primary' : 'bg-vince-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2',
                  done && 'border-vince-primary bg-vince-primary text-white',
                  current &&
                    'border-vince-primary bg-white text-vince-primary ring-4 ring-[#ffd9df]',
                  !done && !current && 'border-vince-border bg-white text-vince-muted',
                )}
              >
                {done ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              <p
                className={cn(
                  'mt-2 text-sm font-semibold uppercase',
                  index <= currentIndex ? 'text-vince-text' : 'text-vince-muted',
                )}
              >
                {t(`status.${status}`)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
