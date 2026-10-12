import { useState } from 'react';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PageScaffold } from '@features/admin';
import { useFormatters } from '@shared/i18n';
import { cn } from '@shared/lib/cn';
import { BellIcon, Button, CheckIcon, EmptyState, FilterChip, SectionPanel } from '@shared/ui';

import {
  useEmailPreferences,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useSetEmailPreference,
} from '../api/hooks';
import { notificationTypes, type AppNotification } from '../model/discussion';

type Filter = 'all' | 'unread';

export function NotificationsPage() {
  const { t } = useTranslation('discussion');
  const { data: notifications = [] } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<Filter>('all');

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visible = notifications.filter((notification) => filter === 'all' || !notification.read);

  return (
    <PageScaffold
      actions={
        <Button
          disabled={unreadCount === 0 || markAll.isPending}
          onClick={() =>
            markAll.mutate(undefined, {
              onSuccess: () => toast.success(t('notifications.allRead')),
            })
          }
          variant="outline"
        >
          <CheckIcon className="h-5 w-5" />
          {t('notifications.markAll')}
        </Button>
      }
      activeSection="notifications"
      description={t('notifications.description')}
      eyebrow={t('notifications.eyebrow')}
      personaRoles={['advisor', 'student', 'coordinator', 'institutionAdmin']}
      title={t('notifications.title')}
    >
      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_380px]">
        <SectionPanel
          actions={
            <div className="flex gap-2">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                {t('notifications.filterAll')}
              </FilterChip>
              <FilterChip active={filter === 'unread'} onClick={() => setFilter('unread')}>
                {t('notifications.filterUnread')} ({unreadCount})
              </FilterChip>
            </div>
          }
          title={t('notifications.listTitle')}
        >
          {visible.length === 0 ? (
            <EmptyState
              icon={<BellIcon className="h-8 w-8" />}
              title={
                filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.empty')
              }
            />
          ) : (
            <ul className="divide-y divide-vince-border">
              {visible.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </ul>
          )}
        </SectionPanel>

        <EmailPreferencesPanel />
      </section>
    </PageScaffold>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const { t } = useTranslation('discussion');
  const { formatDateTime, formatRelative } = useFormatters();
  const markRead = useMarkNotificationRead();

  // Navegar até o objeto marca a notificação como lida (RF-DSC-006 RN2).
  async function handleOpen() {
    if (!notification.read) {
      await markRead.mutateAsync(notification.id);
    }

    window.location.assign(notification.href);
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0',
        !notification.read && '-mx-3 rounded-lg bg-vince-tertiary px-3',
      )}
    >
      <span
        aria-label={notification.read ? undefined : t('notifications.unread')}
        className={cn(
          'mt-2 h-2.5 w-2.5 shrink-0 rounded-full',
          notification.read ? 'bg-transparent' : 'bg-vince-primary',
        )}
        role={notification.read ? undefined : 'img'}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold uppercase tracking-[0.06em] text-vince-muted">
          {t(`notificationTypes.${notification.type}.label`)}
        </p>
        <p className={cn('mt-1 leading-7 text-vince-text', !notification.read && 'font-semibold')}>
          {t(`notificationTypes.${notification.type}.text`, notification.params)}
        </p>
        <time
          className="mt-1 block text-sm text-vince-muted"
          dateTime={notification.createdAt}
          title={formatDateTime(notification.createdAt)}
        >
          {formatRelative(notification.createdAt)}
        </time>
      </div>
      <div className="flex shrink-0 gap-2">
        {!notification.read && (
          <Button
            disabled={markRead.isPending}
            onClick={() => markRead.mutate(notification.id)}
            size="sm"
            variant="ghost"
          >
            {t('notifications.markRead')}
          </Button>
        )}
        <Button onClick={() => void handleOpen()} size="sm" variant="outline">
          {t('notifications.open')}
        </Button>
      </div>
    </li>
  );
}

function EmailPreferencesPanel() {
  const { t } = useTranslation('discussion');
  const { data: preferences } = useEmailPreferences();
  const setPreference = useSetEmailPreference();

  return (
    <SectionPanel className="self-start" title={t('notifications.emailTitle')}>
      <p className="text-sm leading-6 text-vince-muted">{t('notifications.emailHint')}</p>
      <ul className="mt-4 space-y-3">
        {notificationTypes.map((type) => (
          <li key={type}>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                checked={preferences?.[type] ?? false}
                className="h-5 w-5 accent-vince-primary"
                onChange={(event) => setPreference.mutate({ enabled: event.target.checked, type })}
                type="checkbox"
              />
              <span className="text-vince-text">{t(`notificationTypes.${type}.label`)}</span>
            </label>
          </li>
        ))}
      </ul>
    </SectionPanel>
  );
}
