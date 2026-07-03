import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteJson, getJson, patchJson } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { QK } from '@/lib/query-keys';

export type UserSession = {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  expiresAt: string;
};

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      patchJson<{ message: string }>('/auth/change-password', body),
  });
}

export function useProfile(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.profile.me,
    queryFn: () => getJson<Employee>('/users/me'),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; phone?: string; avatarUrl?: string }) =>
      patchJson<Employee>('/users/me', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.profile.me });
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: QK.profile.sessions,
    queryFn: () => getJson<UserSession[]>('/auth/sessions'),
    staleTime: 30_000,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      deleteJson<{ ok: boolean }>(`/auth/sessions/${sessionId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.profile.sessions });
    },
  });
}

export function useRevokeAllOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteJson<{ ok: boolean }>('/auth/sessions'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.profile.sessions });
    },
  });
}
