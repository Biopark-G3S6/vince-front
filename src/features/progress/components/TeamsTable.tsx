import { useTranslation } from 'react-i18next';

import { useFormatters } from '@shared/i18n';
import { articleHref } from '@features/articles';
import { cn } from '@shared/lib/cn';
import { StatusBadge, WarningIcon, type BadgeTone } from '@shared/ui';

import {
  riskThresholds,
  type ArticleStatus,
  type DeliveryState,
  type TeamWithSignals,
} from '../model/progress';

const statusTone: Record<ArticleStatus, BadgeTone> = {
  FINISHED: 'success',
  IN_PROGRESS: 'warning',
  IN_REVIEW: 'primary',
  STARTED: 'muted',
};

const deliveryTone: Record<DeliveryState, BadgeTone> = {
  automatic: 'danger',
  pending: 'muted',
  spontaneous: 'success',
};

type TeamsTableProps = {
  /** O coordenador não participa da discussão nem do ciclo de apontamentos. */
  links: Array<'article' | 'review' | 'discussion'>;
  showAdvisor?: boolean;
  teams: TeamWithSignals[];
};

const linkHref = {
  article: '/artigos/editor',
  discussion: '/admin/discussao',
  review: '/admin/correcao',
};

/** Dados de cada equipe enumerados em RF-ACP-001; a tela apresenta, não altera (RN2). */
export function TeamsTable({ links, showAdvisor = false, teams }: TeamsTableProps) {
  const { t } = useTranslation('progress');
  const { formatDate, formatDateTime, formatRelative } = useFormatters();

  if (teams.length === 0) {
    return <p className="py-6 text-center text-vince-muted">{t('table.empty')}</p>;
  }

  return (
    <div
      aria-label={t('table.caption')}
      className="min-w-0 overflow-x-auto"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[1080px] text-left align-top">
        <caption className="sr-only">{t('table.caption')}</caption>
        <thead className="border-b border-vince-border bg-vince-surface text-sm text-vince-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">{t('table.team')}</th>
            <th className="px-4 py-3 font-semibold">{t('table.status')}</th>
            <th className="px-4 py-3 font-semibold">{t('table.milestone')}</th>
            <th className="px-4 py-3 font-semibold">{t('table.delivery')}</th>
            <th className="px-4 py-3 font-semibold">{t('table.remarks')}</th>
            <th className="px-4 py-3 font-semibold">{t('table.lastEdit')}</th>
            <th className="px-4 py-3 font-semibold">{t('table.signals')}</th>
            <th className="px-4 py-3 font-semibold">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-vince-border">
          {teams.map((team) => (
            <tr className={cn(team.signals.length > 0 && 'bg-[#fff7e8]')} key={team.id}>
              <td className="max-w-[280px] px-4 py-4 align-top">
                <p className="font-bold text-vince-text">{team.name}</p>
                <p className="text-sm text-vince-muted">{team.articleTitle}</p>
                <p className="mt-1 text-sm text-vince-muted">{team.event}</p>
                <p className="mt-1 text-sm text-vince-muted">
                  {team.members.map((member) => member.name).join(', ')}
                </p>
                {showAdvisor && (
                  <p className="mt-1 text-sm font-semibold text-vince-muted">
                    {t('table.advisor', { name: team.advisor })}
                  </p>
                )}
              </td>
              <td className="px-4 py-4 align-top">
                <StatusBadge
                  label={t(`status.${team.articleStatus}`)}
                  tone={statusTone[team.articleStatus]}
                />
              </td>
              <td className="px-4 py-4 align-top">
                <p className="font-semibold text-vince-text">{team.milestone.name}</p>
                <p className="text-sm text-vince-muted">
                  {t('table.deadline', { date: formatDate(team.milestone.deadline) })}
                </p>
              </td>
              <td className="px-4 py-4 align-top">
                <StatusBadge
                  label={t(`delivery.${team.delivery}`)}
                  tone={deliveryTone[team.delivery]}
                />
              </td>
              <td className="px-4 py-4 align-top text-lg font-bold text-vince-text">
                {team.pendingRemarks}
              </td>
              <td className="px-4 py-4 align-top">
                <time
                  className="text-vince-text"
                  dateTime={team.lastEditedAt}
                  title={formatDateTime(team.lastEditedAt)}
                >
                  {formatRelative(team.lastEditedAt)}
                </time>
              </td>
              <td className="max-w-[240px] px-4 py-4 align-top">
                {team.signals.length === 0 ? (
                  <span className="text-sm text-vince-muted">{t('table.noSignal')}</span>
                ) : (
                  <ul className="space-y-1.5">
                    {team.signals.map((signal) => (
                      <li
                        className="flex items-start gap-1.5 text-sm font-semibold text-[#7a5415]"
                        key={signal}
                      >
                        <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        {t(`signal.${signal}`, { days: riskThresholds.idleDays })}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="px-4 py-4 align-top">
                {team.articleId ? (
                  <ul className="space-y-1">
                    {links.map((link) => (
                      <li key={link}>
                        <a
                          className="text-sm font-semibold text-vince-primary underline"
                          href={articleHref(linkHref[link], team.articleId)}
                        >
                          {t(`table.${link}`)}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-vince-muted">
                    {t('table.previewOnly', {
                      defaultValue: 'Equipe de demonstração sem artigo cadastrado.',
                    })}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
