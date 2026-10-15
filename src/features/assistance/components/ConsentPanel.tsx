import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useCurrentUser } from '@features/admin';
import { getErrorCode } from '@shared/api/apiError';
import { useFormatters } from '@shared/i18n';
import { Button, Notice, SectionPanel, StatusBadge } from '@shared/ui';

import { useConsent, useSetConsent } from '../api/hooks';

/** RF-IAA-005 — Consentir com o uso de inteligência artificial. */
export function ConsentPanel() {
  const { t } = useTranslation('assistance');
  const { formatDateTime } = useFormatters();
  const user = useCurrentUser();
  const consent = useConsent();
  const setConsent = useSetConsent();
  const canDecide = user.role === 'institutionAdmin';

  if (!consent.data) {
    return null;
  }

  const { active, declarationVersion, history, institution } = consent.data;

  const decide = (next: boolean) =>
    setConsent.mutate(next, {
      onError: (error) =>
        toast.error(t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') })),
      onSuccess: () => toast.success(next ? t('consent.granted') : t('consent.revoked')),
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <SectionPanel
        actions={
          <StatusBadge
            label={active ? t('consent.active') : t('consent.inactive')}
            tone={active ? 'success' : 'danger'}
          />
        }
        title={t('consent.declaration', { version: declarationVersion })}
      >
        <p className="text-sm text-vince-muted">
          {t('consent.institution')}: <strong className="text-vince-text">{institution}</strong>
        </p>
        <dl className="mt-5 space-y-4">
          {(['what', 'why', 'who'] as const).map((topic) => (
            <div key={topic}>
              <dt className="font-bold text-vince-text">{t(`consent.${topic}Title`)}</dt>
              <dd className="mt-1 leading-7 text-vince-muted">{t(`consent.${topic}Body`)}</dd>
            </div>
          ))}
        </dl>
        <Notice className="mt-5">{t('consent.scope')}</Notice>

        <div className="mt-6 flex justify-end">
          {canDecide ? (
            <Button
              disabled={setConsent.isPending}
              onClick={() => decide(!active)}
              variant={active ? 'outline' : 'primary'}
            >
              {active ? t('consent.revoke') : t('consent.grant')}
            </Button>
          ) : (
            <p className="text-sm text-vince-muted">{t('consent.restricted')}</p>
          )}
        </div>
      </SectionPanel>

      <SectionPanel className="self-start" title={t('consent.history')}>
        <ol className="space-y-4">
          {[...history].reverse().map((record) => (
            <li className="border-l-2 border-vince-border pl-4" key={record.at}>
              <p className="font-semibold text-vince-text">
                {t(`consent.record.${record.action}`)}
              </p>
              <p className="text-sm text-vince-muted">
                {t('consent.recordMeta', {
                  by: record.by,
                  date: formatDateTime(record.at),
                  version: record.declarationVersion,
                })}
              </p>
            </li>
          ))}
        </ol>
      </SectionPanel>
    </div>
  );
}
