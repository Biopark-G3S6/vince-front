import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useFormatters } from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import { Button, ChevronLeftIcon, ChevronRightIcon, Notice } from '@shared/ui';

import { countChangedWords, diffParagraphs, type ParagraphDiff } from '../model/diff';
import {
  findMilestone,
  previousSubmission,
  type ReviewCycle,
  type Submission,
} from '../model/review';

import { DiffText } from './DiffText';

type VersionComparisonProps = {
  cycle: ReviewCycle;
  onSelect: (submissionId: string) => void;
  submissionId: string;
};

/** Versão entregue e a anterior, lado a lado (RF-REV-010). */
export function VersionComparison({ cycle, onSelect, submissionId }: VersionComparisonProps) {
  const { t } = useTranslation('review');
  const { formatDateTime, formatNumber } = useFormatters();
  const [position, setPosition] = useState(0);

  const selected = cycle.submissions.find((submission) => submission.id === submissionId);
  const previous = previousSubmission(cycle, submissionId);

  const diffs = useMemo(
    () => (selected ? diffParagraphs(previous?.paragraphs ?? [], selected.paragraphs) : []),
    [previous, selected],
  );
  const changed = diffs.filter((diff) => diff.change !== 'equal');
  const totals = changed.reduce(
    (sum, diff) => {
      const words = countChangedWords(diff.segments);
      return { deleted: sum.deleted + words.deleted, inserted: sum.inserted + words.inserted };
    },
    { deleted: 0, inserted: 0 },
  );
  const activeId = changed[position]?.id;

  const describe = (submission: Submission) =>
    t('compare.option', {
      date: formatDateTime(submission.submittedAt),
      milestone: findMilestone(cycle, submission.milestoneId)?.name ?? '',
    });

  function goTo(next: number) {
    const target = changed[(next + changed.length) % changed.length];

    if (target) {
      setPosition(changed.indexOf(target));
      document
        .getElementById(`diferenca-${target.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (!selected) {
    return <p className="text-vince-muted">{t('submissions.empty')}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-vince-muted">
            {t('compare.select')}
          </span>
          <select
            className="h-11 rounded-lg border border-vince-border bg-white px-3 text-vince-text focus:border-vince-primary"
            onChange={(event) => {
              setPosition(0);
              onSelect(event.target.value);
            }}
            value={submissionId}
          >
            {cycle.submissions.map((submission) => (
              <option key={submission.id} value={submission.id}>
                {describe(submission)}
              </option>
            ))}
          </select>
        </label>

        {previous && changed.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              aria-label={t('compare.prev')}
              onClick={() => goTo(position - 1)}
              size="icon"
              variant="outline"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <span aria-live="polite" className="text-sm font-semibold text-vince-muted">
              {t('compare.position', { current: position + 1, total: changed.length })}
            </span>
            <Button
              aria-label={t('compare.next')}
              onClick={() => goTo(position + 1)}
              size="icon"
              variant="outline"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {!previous ? (
        <>
          <Notice>{t('compare.first')}</Notice>
          <div className="rounded-lg border border-vince-border bg-white p-6">
            {selected.paragraphs.map((paragraph) => (
              <div className="mb-4 last:mb-0" key={paragraph.id}>
                {paragraph.heading && (
                  <h4 className="mb-1 font-extrabold uppercase text-vince-primary">
                    {paragraph.heading}
                  </h4>
                )}
                <p className="leading-7 text-vince-text">{paragraph.text}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-vince-muted">
            <span>
              {changed.length === 0
                ? t('compare.noDifferences')
                : t('compare.summary', {
                    count: changed.length,
                    deleted: formatNumber(totals.deleted),
                    inserted: formatNumber(totals.inserted),
                  })}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-red-100 outline outline-1 outline-red-300" />
              {t('compare.legendDeleted')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-green-100 outline outline-1 outline-green-300" />
              {t('compare.legendInserted')}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-vince-border bg-white">
            <div className="grid grid-cols-2 border-b border-vince-border bg-vince-surface text-sm font-bold text-vince-muted">
              <p className="border-r border-vince-border px-4 py-3">
                {t('compare.previous')} · {describe(previous)}
              </p>
              <p className="px-4 py-3">
                {t('compare.selected')} · {describe(selected)}
              </p>
            </div>
            {diffs.map((diff) => (
              <DiffRow active={diff.id === activeId} diff={diff} key={diff.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DiffRow({ active, diff }: { active: boolean; diff: ParagraphDiff }) {
  const { t } = useTranslation('review');
  const absent = <p className="text-sm italic text-vince-muted">{t('compare.absent')}</p>;

  return (
    <div
      className={cn(
        'grid grid-cols-2 border-b border-vince-border last:border-b-0',
        diff.change !== 'equal' && 'bg-[#fffdf7]',
        active && 'outline outline-2 -outline-offset-2 outline-vince-primary',
      )}
      id={`diferenca-${diff.id}`}
    >
      <div className="border-r border-vince-border px-4 py-4">
        {diff.heading && diff.before !== null && (
          <h4 className="mb-1 text-sm font-extrabold uppercase text-vince-primary">
            {diff.heading}
          </h4>
        )}
        {diff.before === null ? (
          absent
        ) : (
          <p className="leading-7 text-vince-text">
            <DiffText segments={diff.segments} side="before" />
          </p>
        )}
      </div>
      <div className="px-4 py-4">
        {diff.heading && diff.after !== null && (
          <h4 className="mb-1 text-sm font-extrabold uppercase text-vince-primary">
            {diff.heading}
          </h4>
        )}
        {diff.after === null ? (
          absent
        ) : (
          <p className="leading-7 text-vince-text">
            <DiffText segments={diff.segments} side="after" />
          </p>
        )}
      </div>
    </div>
  );
}
