import { useTranslation } from 'react-i18next';

import { useFormatters } from '@shared/i18n';
import { Notice, ProgressBar, SectionPanel, ShieldIcon } from '@shared/ui';

import { useAuthorshipSignals } from '../api/hooks';

/** RF-IAA-004 — Indícios objetivos sobre como o texto foi produzido. */
export function AuthorshipPanel() {
  const { t } = useTranslation('assistance');
  const { formatDateTime, formatNumber, formatPercent } = useFormatters();
  const signals = useAuthorshipSignals();

  if (signals.isError) {
    return <Notice tone="warning">{t('authorship.restricted')}</Notice>;
  }

  if (!signals.data) {
    return null;
  }

  const { authorship, importMetadata, largeInsertions, revisedShare, sessions } = signals.data;

  return (
    <div className="space-y-6">
      <Notice icon={<ShieldIcon className="h-5 w-5" />}>{t('authorship.factsNotice')}</Notice>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionPanel title={t('authorship.largeInsertions')}>
          <ul className="divide-y divide-vince-border">
            {largeInsertions.map((insertion) => (
              <li
                className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
                key={insertion.id}
              >
                <span>
                  <span className="block font-semibold text-vince-text">{insertion.author}</span>
                  <span className="text-sm text-vince-muted">{formatDateTime(insertion.at)}</span>
                </span>
                <span className="font-bold text-vince-primary">
                  {t('authorship.characters', { count: formatNumber(insertion.characters) })}
                </span>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel title={t('authorship.byMember')}>
          <ul className="space-y-4">
            {authorship.map((member) => (
              <li key={member.memberId}>
                <p className="mb-1 font-semibold text-vince-text">{member.name}</p>
                <ProgressBar value={Math.round(member.share * 100)} />
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-baseline justify-between gap-3 border-t border-vince-border pt-4">
            <span className="text-vince-muted">{t('authorship.revised')}</span>
            <span className="text-2xl font-black text-vince-primary">
              {formatPercent(revisedShare)}
            </span>
          </p>
        </SectionPanel>

        <SectionPanel title={t('authorship.sessions')}>
          <ol className="space-y-3 border-l-2 border-vince-border pl-4">
            {sessions.map((session) => (
              <li className="flex flex-wrap items-baseline justify-between gap-2" key={session.id}>
                <span>
                  <span className="block font-semibold text-vince-text">{session.author}</span>
                  <span className="text-sm text-vince-muted">
                    {formatDateTime(session.startedAt)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-vince-muted">
                  {t('authorship.minutes', { count: session.minutes })}
                </span>
              </li>
            ))}
          </ol>
        </SectionPanel>

        <SectionPanel title={t('authorship.import')}>
          {importMetadata ? (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-vince-muted">{t('authorship.editingTime')}</dt>
                <dd className="font-bold text-vince-text">
                  {t('authorship.minutes', { count: importMetadata.editingMinutes })}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-vince-muted">{t('authorship.revisions')}</dt>
                <dd className="font-bold text-vince-text">
                  {formatNumber(importMetadata.revisions)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-vince-muted">{t('authorship.application')}</dt>
                <dd className="font-bold text-vince-text">{importMetadata.application}</dd>
              </div>
              <div>
                <dt className="text-sm text-vince-muted">{t('authorship.declaredAuthor')}</dt>
                <dd className="font-bold text-vince-text">{importMetadata.declaredAuthor}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-vince-muted">{t('authorship.importNone')}</p>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
