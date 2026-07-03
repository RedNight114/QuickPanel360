'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson } from '../lib/api';
import { QK } from '../lib/query-keys';
import type { NotificationPreference, NotificationType } from '../lib/types';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: QK.profile.notificationPreferences,
    queryFn: () => getJson<NotificationPreference[]>('/users/me/notification-preferences'),
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { notificationType: NotificationType; enabled: boolean }) =>
      patchJson<NotificationPreference>('/users/me/notification-preferences', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.profile.notificationPreferences });
    },
  });
}
