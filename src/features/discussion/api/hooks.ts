import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@features/admin';

import type { NotificationType } from '../model/discussion';

import {
  deleteMessage,
  getEmailPreferences,
  listMessages,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  postMessage,
  setEmailPreference,
  type PostMessageInput,
} from './discussionApi';

export const discussionKeys = {
  emailPreferences: (userId: string) => ['notifications', 'email', userId] as const,
  messages: (userId: string) => ['discussion', 'messages', userId] as const,
  notifications: (userId: string) => ['notifications', 'list', userId] as const,
};

export function useMessages() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => listMessages(user.id),
    queryKey: discussionKeys.messages(user.id),
    retry: false,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['discussion'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
}

export function usePostMessage() {
  const user = useCurrentUser();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (input: Omit<PostMessageInput, 'actorId'>) =>
      postMessage({ ...input, actorId: user.id }),
    onSuccess: invalidate,
  });
}

export function useDeleteMessage() {
  const user = useCurrentUser();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(user.id, messageId),
    onSuccess: invalidate,
  });
}

export function useNotifications() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => listNotifications(user.id),
    queryKey: discussionKeys.notifications(user.id),
  });
}

export function useMarkNotificationRead() {
  const user = useCurrentUser();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(user.id, notificationId),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const user = useCurrentUser();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(user.id),
    onSuccess: invalidate,
  });
}

export function useEmailPreferences() {
  const user = useCurrentUser();

  return useQuery({
    queryFn: () => getEmailPreferences(user.id),
    queryKey: discussionKeys.emailPreferences(user.id),
  });
}

export function useSetEmailPreference() {
  const user = useCurrentUser();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ enabled, type }: { enabled: boolean; type: NotificationType }) =>
      setEmailPreference(user.id, type, enabled),
    onSuccess: invalidate,
  });
}
