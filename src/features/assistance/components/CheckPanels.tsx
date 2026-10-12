import type { ReactNode } from 'react';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useCurrentUser } from '@features/admin';
import { getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { Button, CheckCircleIcon, Notice, SearchIcon, SectionPanel } from '@shared/ui';

import { useComplianceCheck, useSimilarityCheck } from '../api/hooks';
import type { ComplianceCategory } from '../model/assistance';

const categories: ComplianceCategory[] = ['formatting', 'structure', 'references'];

type RunHeaderProps = {
  checkedAt: string | undefined;
  children: ReactNode;
  onRun: () => void;
  pending: boolean;
};

function RunHeader({ checkedAt, children, onRun, pending }: RunHeaderProps) {
  const { t } = useTranslation('assistance');
  const { formatDateTime } = useFormatters();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl space-y-2 leading-7 text-vince-muted">{children}</div>
      <div className="shrink-0 text-right">
        <Button disabled={pending} onClick={onRun}>
          <SearchIcon className="h-5 w-5" />
          {pending ? t('common.running') : checkedAt ? t('common.rerun') : t('common.run')}
        </Button>
        {checkedAt && (
          <p className="mt-2 text-sm text-vince-muted">
            {t('common.checkedAt', { date: formatDateTime(checkedAt) })}
          </p>
        )}
      </div>
    </div>
  );
}

function useRunError() {
  const { t } = useTranslation('assistance');

  return (error: unknown) =>
    toast.error(t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') }));
}

/** RF-IAA-002 — Verificar a conformidade do artigo à norma. */
export function CompliancePanel() {
  const { t } = useTranslation('assistance');
  const check = useComplianceCheck();
  const onError = useRunError();
  const findings = check.data?.findings;

  return (
    <div className="space-y-6">
      <RunHeader
        checkedAt={check.data?.checkedAt}
        onRun={() => check.mutate(undefined, { onError })}
        pending={check.isPending}
      >
        <p>{t('compliance.intro')}</p>
        <p className="text-sm">{t('compliance.local')}</p>
      </RunHeader>

      {findings?.length === 0 && (
        <Notice icon={<CheckCircleIcon className="h-5 w-5" />} tone="success">
          {t('compliance.conform')}
        </Notice>
      )}

      {findings &&
        categories.map((category) => {
          const items = findings.filter((finding) => finding.category === category);

          if (items.length === 0) {
            return null;
          }

          return (
            <SectionPanel
              actions={
                <span className="text-sm font-semibold text-vince-muted">
                  {t('compliance.count', { count: items.length })}
                </span>
              }
              key={category}
              title={t(`compliance.category.${category}`)}
            >
              <ul className="divide-y divide-vince-border">
                {items.map((finding) => (
                  <li className="py-3 first:pt-0 last:pb-0" key={finding.id}>
                    <p className="font-semibold text-vince-text">
                      {t(`compliance.finding.${finding.code}`, finding.params)}
                    </p>
                    <p className="mt-1 text-sm text-vince-muted">
                      {t('common.location')}: {finding.location || t('common.wholeDocument')}
                    </p>
                    {finding.excerpt && (
                      <p className="mt-1 border-l-4 border-vince-border pl-3 text-sm italic text-vince-muted">
                        {finding.excerpt}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </SectionPanel>
          );
        })}
    </div>
  );
}

/** RF-IAA-003 — Verificar a similaridade do artigo com o acervo. */
export function SimilarityPanel() {
  const { t } = useTranslation('assistance');
  const { formatPercent } = useFormatters();
  const user = useCurrentUser();
  const check = useSimilarityCheck();
  const onError = useRunError();
  const result = check.data;

  return (
    <div className="space-y-6">
      <RunHeader
        checkedAt={result?.checkedAt}
        onRun={() => check.mutate(undefined, { onError })}
        pending={check.isPending}
      >
        <p>{t('similarity.intro')}</p>
        <p className="text-sm">
          {user.role === 'advisor' ? t('similarity.advisorNote') : t('similarity.studentNote')}
        </p>
      </RunHeader>

      {result && result.matches.length === 0 && <Notice>{t('similarity.none')}</Notice>}

      {result && result.matches.length > 0 && (
        <SectionPanel
          actions={
            <p className="text-right">
              <span className="block text-sm text-vince-muted">{t('similarity.total')}</span>
              <span className="text-2xl font-black text-vince-primary">
                {formatPercent(result.totalShare)}
              </span>
            </p>
          }
          title={t('similarity.matches')}
        >
          <ul className="space-y-4">
            {result.matches.map((match) => (
              <li className="rounded-lg border border-vince-border p-4" key={match.id}>
                <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-vince-muted">
                  <span>
                    {t('common.location')}: {match.location}
                  </span>
                  <span>{t('similarity.share', { share: formatPercent(match.share) })}</span>
                </p>
                <p className="mt-2 border-l-4 border-vince-primary pl-3 italic leading-7 text-vince-text">
                  “{match.excerpt}”
                </p>
                <p className="mt-2 text-sm text-vince-muted">
                  {match.origin
                    ? t('similarity.origin', match.origin)
                    : t('similarity.originHidden')}
                </p>
              </li>
            ))}
          </ul>
        </SectionPanel>
      )}
    </div>
  );
}
