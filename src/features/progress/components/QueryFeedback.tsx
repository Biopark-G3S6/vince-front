import { useTranslation } from 'react-i18next';

import { getErrorCode } from '@shared/api/apiError';
import { Button, Notice } from '@shared/ui';

export function QueryFeedback({ error, onRetry }: { error?: Error | null; onRetry: () => void }) {
  const { t } = useTranslation('progress');
  if (!error)
    return (
      <p
        className="rounded-lg border border-vince-border bg-white p-6 text-vince-muted"
        role="status"
      >
        {t('loading', { defaultValue: 'Carregando dados...' })}
      </p>
    );

  return (
    <Notice tone="danger">
      <p>{t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') })}</p>
      <Button className="mt-3" onClick={onRetry} size="sm" variant="outline">
        {t('retry', { defaultValue: 'Tentar novamente' })}
      </Button>
    </Notice>
  );
}
