import { useTranslation } from 'react-i18next';

import { currentArticle } from '@features/articles';
import { useFormatters } from '@shared/i18n';
import { Button, CompareIcon, StatusBadge } from '@shared/ui';

import { findMilestone, type ReviewCycle } from '../model/review';

type SubmissionHistoryProps = {
  cycle: ReviewCycle;
  onCompare: (submissionId: string) => void;
};

export function SubmissionHistory({ cycle, onCompare }: SubmissionHistoryProps) {
  const { t } = useTranslation('review');
  const { formatDateTime } = useFormatters();

  if (cycle.submissions.length === 0) {
    return <p className="text-vince-muted">{t('submissions.empty')}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-vince-border bg-white">
      <table className="w-full min-w-[720px] text-left">
        <thead className="bg-vince-surface text-sm text-vince-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">{t('submissions.milestone')}</th>
            <th className="px-4 py-3 font-semibold">{t('submissions.author')}</th>
            <th className="px-4 py-3 font-semibold">{t('submissions.date')}</th>
            <th className="px-4 py-3 font-semibold">{t('submissions.kind')}</th>
            <th className="px-4 py-3 font-semibold">{t('submissions.returned')}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-vince-border">
          {[...cycle.submissions].reverse().map((submission) => (
            <tr key={submission.id}>
              <td className="px-4 py-3 font-semibold text-vince-text">
                {findMilestone(cycle, submission.milestoneId)?.name}
              </td>
              <td className="px-4 py-3 text-vince-text">
                {currentArticle.members.find((member) => member.id === submission.submittedBy)
                  ?.name ?? t('submissions.system')}
              </td>
              <td className="px-4 py-3 text-vince-muted">
                {formatDateTime(submission.submittedAt)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={
                    submission.automatic ? t('submissions.automatic') : t('submissions.spontaneous')
                  }
                  tone={submission.automatic ? 'danger' : 'success'}
                />
              </td>
              <td className="px-4 py-3 text-vince-muted">
                {submission.returnedAt
                  ? formatDateTime(submission.returnedAt)
                  : t('submissions.inReview')}
              </td>
              <td className="px-4 py-3 text-right">
                <Button onClick={() => onCompare(submission.id)} size="sm" variant="outline">
                  <CompareIcon className="h-4 w-4" />
                  {t('submissions.compare')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
