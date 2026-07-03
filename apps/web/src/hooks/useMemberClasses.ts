import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteJson, getJson, putJson } from '@/lib/api';
import type { MemberClassConfig } from '@/lib/types';
import { QK } from '@/lib/query-keys';

export function useMemberClasses(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.memberClasses.all,
    queryFn: () => getJson<MemberClassConfig[]>('/member-classes'),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useUpsertMemberClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<MemberClassConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) =>
      putJson<MemberClassConfig>(`/member-classes/${body.memberClass}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.memberClasses.all });
    },
  });
}

export function useDeleteMemberClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberClass: string) =>
      deleteJson(`/member-classes/${memberClass}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.memberClasses.all });
    },
  });
}
