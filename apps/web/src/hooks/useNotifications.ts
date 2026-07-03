import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type {
  InternalNotification,
  NotificationsUnreadCount,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '@/lib/types';

export type NotificationsFilters = {
  type?: NotificationType | 'all';
  priority?: NotificationPriority | 'all';
  status?: NotificationStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  take?: number;
};

function buildQuery(filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

function useNotificationsInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    // Invalidate all notifications keys including unread-count (bell badge)
    queryClient.invalidateQueries({ queryKey: QK.notifications.all });
  };
}

export function useNotifications(filters: NotificationsFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.notifications.list(filters),
    queryFn: () => getJson<InternalNotification[]>(`/notifications${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
  });
}

export function useNotificationsUnreadCount(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.notifications.unreadCount,
    queryFn: () => getJson<NotificationsUnreadCount>('/notifications/unread-count'),
    enabled: options.enabled ?? true,
    staleTime: 120_000,
    refetchInterval: 120_000,
  });
}

export function useReadNotification() {
  const invalidate = useNotificationsInvalidation();

  return useMutation({
    mutationFn: (id: string) => patchJson<InternalNotification>(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });
}

export function useReadAllNotifications() {
  const invalidate = useNotificationsInvalidation();

  return useMutation({
    mutationFn: () => patchJson<{ updated: number }>('/notifications/read-all'),
    onSuccess: invalidate,
  });
}

export function useResolveNotification() {
  const invalidate = useNotificationsInvalidation();

  return useMutation({
    mutationFn: (id: string) => patchJson<InternalNotification>(`/notifications/${id}/resolve`),
    onSuccess: invalidate,
  });
}

export function useReviewNotification() {
  const invalidate = useNotificationsInvalidation();

  return useMutation({
    mutationFn: (id: string) => patchJson<InternalNotification>(`/notifications/${id}/in-review`),
    onSuccess: invalidate,
  });
}

export function useArchiveNotification() {
  const invalidate = useNotificationsInvalidation();

  return useMutation({
    mutationFn: (id: string) => patchJson<InternalNotification>(`/notifications/${id}/archive`),
    onSuccess: invalidate,
  });
}
