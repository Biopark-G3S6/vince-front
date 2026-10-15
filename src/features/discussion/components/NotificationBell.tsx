import { useTranslation } from 'react-i18next';

import { BellIcon } from '@shared/ui';

import { useNotifications } from '../api/hooks';

/** Sino do cabeçalho, com o indicador de não lidas (RF-DSC-006). */
export function NotificationBell() {
  const { t } = useTranslation('discussion');
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <a
      aria-label={
        unread > 0 ? t('notifications.bellUnread', { count: unread }) : t('notifications.bell')
      }
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-vince-muted hover:bg-vince-tertiary"
      href="/admin/notificacoes"
    >
      <BellIcon className="h-6 w-6" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-vince-primary px-1 text-xs font-bold text-white">
          {unread}
        </span>
      )}
    </a>
  );
}
