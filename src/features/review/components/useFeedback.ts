import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getErrorCode } from '@shared/api/apiError';

/** Traduz no cliente o código devolvido pela API (ADR-0026 §14). */
export function useFeedback() {
  const { t } = useTranslation('review');

  return {
    onError: (error: unknown) => {
      toast.error(t(`errors.${getErrorCode(error)}`, { defaultValue: t('errors.UNKNOWN') }));
    },
    success: (key: string) => () => {
      toast.success(t(`feedback.${key}`));
    },
  };
}
