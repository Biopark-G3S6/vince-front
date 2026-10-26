import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useFormatters } from '@shared/i18n';
import { EmptyState, Notice, ProgressBar, WarningIcon } from '@shared/ui';

import { useAdvisorTeams, useContribution } from '../api/hooks';
import { QueryFeedback } from './QueryFeedback';

/** RF-ACP-004 — Participação de cada integrante, subsídio à avaliação individual. */
export function ContributionPanel() {
  const { t } = useTranslation('progress');
  const { compareText, formatNumber } = useFormatters();
  const teamsQuery = useAdvisorTeams();
  const teams = teamsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string>();
  const teamId = teams.some((team) => team.id === selectedId) ? selectedId : teams[0]?.id;
  const contributionQuery = useContribution(teamId);
  const contribution = contributionQuery.data;

  if (!teamsQuery.data)
    return (
      <QueryFeedback
        error={teamsQuery.error}
        onRetry={() => {
          void teamsQuery.refetch();
        }}
      />
    );

  if (teams.length === 0) {
    return <EmptyState description={t('teams.emptyBody')} title={t('teams.emptyTitle')} />;
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-vince-muted">
          {t('contribution.team')}
        </span>
        <select
          className="h-11 w-full min-w-0 max-w-2xl rounded-lg border border-vince-border bg-white px-3 text-vince-text focus:border-vince-primary"
          onChange={(event) => setSelectedId(event.target.value)}
          value={teamId}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} — {team.articleTitle}
            </option>
          ))}
        </select>
      </label>

      <Notice>
        <p>{t('contribution.subsidy')}</p>
        <p className="font-semibold">{t('contribution.volume')}</p>
        <p>{t('contribution.private')}</p>
      </Notice>

      {!contribution && (
        <QueryFeedback
          error={contributionQuery.error}
          onRetry={() => {
            void contributionQuery.refetch();
          }}
        />
      )}

      {contribution?.imported && (
        <Notice icon={<WarningIcon className="h-5 w-5" />} tone="warning">
          {t('contribution.imported')}
        </Notice>
      )}

      {contribution && (
        <div
          aria-label={contribution.teamName}
          className="min-w-0 overflow-x-auto rounded-lg border border-vince-border bg-white shadow-sm"
          role="region"
          tabIndex={0}
        >
          <table className="w-full min-w-[720px] text-left">
            <caption className="sr-only">{contribution.teamName}</caption>
            <thead className="border-b border-vince-border bg-vince-surface text-sm text-vince-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('contribution.member')}</th>
                <th className="w-64 px-4 py-3 font-semibold">{t('contribution.textShare')}</th>
                <th className="px-4 py-3 font-semibold">{t('contribution.sessions')}</th>
                <th className="px-4 py-3 font-semibold">{t('contribution.remarksAddressed')}</th>
                <th className="px-4 py-3 font-semibold">{t('contribution.messages')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vince-border">
              {[...contribution.members]
                // Ordem alfabética: o quadro não ordena por desempenho (RN1).
                .sort((a, b) => compareText(a.name, b.name))
                .map((member) => (
                  <tr key={member.name}>
                    <td className="px-4 py-4 font-semibold text-vince-text">{member.name}</td>
                    <td className="px-4 py-4">
                      {contribution.imported ? (
                        <span className="text-vince-muted">{t('contribution.noShare')}</span>
                      ) : (
                        <ProgressBar value={Math.round(member.textShare * 100)} />
                      )}
                    </td>
                    <td className="px-4 py-4 text-vince-text">{formatNumber(member.sessions)}</td>
                    <td className="px-4 py-4 text-vince-text">
                      {formatNumber(member.remarksAddressed)}
                    </td>
                    <td className="px-4 py-4 text-vince-text">{formatNumber(member.messages)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <a className="inline-block font-semibold text-vince-primary underline" href="/admin/artigos">
        {t('contribution.evaluate')}
      </a>
    </div>
  );
}
