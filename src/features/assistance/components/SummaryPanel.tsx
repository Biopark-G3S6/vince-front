import { useTranslation } from 'react-i18next';

import type { Remark } from '@features/review';
import { getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { MetricCard, Notice, SectionPanel, SparklesIcon, WarningIcon } from '@shared/ui';

import { useChangeSummary } from '../api/hooks';

/** RF-IAA-001 — Resumo das alterações da entrega. */
export function SummaryPanel() {
  const { t } = useTranslation('assistance');
  const { formatNumber } = useFormatters();
  const summary = useChangeSummary();

  if (summary.isPending) {
    return null;
  }

  // A indisponibilidade da análise não impede a correção (RN3).
  if (summary.isError) {
    return (
      <Notice
        icon={<WarningIcon className="h-5 w-5" />}
        title={t('summary.unavailableTitle')}
        tone="warning"
      >
        <p>
          {t(`summaryErrors.${getErrorCode(summary.error)}`, {
            defaultValue: t('summaryErrors.UNKNOWN'),
          })}
        </p>
        <p>
          {t('summary.continues')}{' '}
          <a className="font-bold underline" href="/admin/correcao">
            {t('common.openReview')}
          </a>
        </p>
      </Notice>
    );
  }

  const { highlights, insufficientRemarks, totals, unchangedRemarks } = summary.data;

  return (
    <div className="space-y-6">
      <Notice icon={<SparklesIcon className="h-5 w-5" />}>
        <p>{t('summary.aiNotice')}</p>
        <p className="font-semibold">{t('summary.decisionNotice')}</p>
      </Notice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={t('summary.changed')} value={formatNumber(totals.changed)} />
        <MetricCard label={t('summary.added')} value={formatNumber(totals.added)} />
        <MetricCard label={t('summary.removed')} value={formatNumber(totals.removed)} />
        <MetricCard label={t('summary.inserted')} value={formatNumber(totals.inserted)} />
        <MetricCard label={t('summary.deleted')} value={formatNumber(totals.deleted)} />
      </div>

      <SectionPanel title={t('summary.highlights')}>
        <ul className="divide-y divide-vince-border">
          {highlights.map((highlight) => (
            <li className="py-3 first:pt-0 last:pb-0" key={highlight.id}>
              <p className="font-semibold text-vince-text">
                {highlight.heading ?? t('summary.untitled')}
              </p>
              <p className="text-sm text-vince-muted">
                {t(`summary.highlight.${highlight.change}`, {
                  deleted: formatNumber(highlight.deleted),
                  inserted: formatNumber(highlight.inserted),
                })}
              </p>
            </li>
          ))}
        </ul>
      </SectionPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionPanel title={t('summary.unchangedTitle')}>
          <RemarkList empty={t('summary.unchangedEmpty')} remarks={unchangedRemarks} />
        </SectionPanel>
        <SectionPanel title={t('summary.insufficientTitle')}>
          <p className="mb-3 text-sm text-vince-muted">{t('summary.insufficientHint')}</p>
          <RemarkList empty={t('summary.insufficientEmpty')} remarks={insufficientRemarks} />
        </SectionPanel>
      </div>
    </div>
  );
}

function RemarkList({ empty, remarks }: { empty: string; remarks: Remark[] }) {
  const { t } = useTranslation('assistance');

  if (remarks.length === 0) {
    return <p className="text-vince-muted">{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {remarks.map((remark) => (
        <li className="rounded-lg border border-vince-border p-4" key={remark.id}>
          <p className="truncate text-sm italic text-vince-muted">“{remark.quote}”</p>
          <p className="mt-1 leading-6 text-vince-text">{remark.text}</p>
          <a
            className="mt-2 inline-block text-sm font-semibold text-vince-primary underline"
            href={`/admin/correcao?apontamento=${remark.id}`}
          >
            {t('common.openRemark')}
          </a>
        </li>
      ))}
    </ul>
  );
}
