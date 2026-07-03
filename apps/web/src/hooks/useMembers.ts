import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteJson, getJson, patchJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type { Member, MemberClassBenefit, MemberIncident, MemberNote } from '@/lib/types';

export function useMemberSearch(query: string) {
  return useQuery({
    queryKey: QK.members.search(query),
    queryFn: () =>
      getJson<Member[]>(`/members/search?q=${encodeURIComponent(query)}`),
  });
}

export function useMembers() {
  return useQuery({
    queryKey: QK.members.all,
    queryFn: () => getJson<Member[]>('/members'),
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      postJson<Member>('/members', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      patchJson<Member>(`/members/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useChangeMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patchJson<Member>(`/members/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useSaveMemberBenefits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (benefits: MemberClassBenefit[]) =>
      patchJson<MemberClassBenefit[]>('/members/benefits/config', {
        benefits: benefits.map((b) => ({
          memberClass: b.memberClass,
          discountPercent: Number(b.discountPercent ?? 0),
          birthdayBenefitEnabled: Boolean(b.birthdayBenefitEnabled),
          birthdayDiscountPercent: Number(b.birthdayDiscountPercent ?? 0),
          birthdayGiftNote: b.birthdayGiftNote ?? undefined,
          allowSpecialCreditLimit: Boolean(b.allowSpecialCreditLimit),
          creditLimitAmount: Number(b.creditLimitAmount ?? 0),
          notes: b.notes ?? undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useCreateMemberNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, note, visibility }: { memberId: string; note: string; visibility?: string }) =>
      postJson<MemberNote>(`/members/${memberId}/notes`, { note, visibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useDeleteMemberNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, noteId }: { memberId: string; noteId: string }) =>
      deleteJson(`/members/${memberId}/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useMemberIncidents(memberId?: string | null) {
  return useQuery({
    queryKey: ['members', 'incidents', memberId] as const,
    queryFn: () => getJson<MemberIncident[]>(`/members/${memberId}/incidents`),
    enabled: Boolean(memberId),
  });
}

export function useCreateMemberIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      type,
      severity,
      description,
    }: {
      memberId: string;
      type: string;
      severity?: string;
      description: string;
    }) =>
      postJson<MemberIncident>(`/members/${memberId}/incidents`, {
        type,
        severity,
        description,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['members', 'incidents', variables.memberId],
      });
    },
  });
}

export function useResolveMemberIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      incidentId,
      status,
    }: {
      memberId: string;
      incidentId: string;
      status: string;
    }) =>
      patchJson<MemberIncident>(`/members/${memberId}/incidents/${incidentId}`, {
        status,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['members', 'incidents', variables.memberId],
      });
    },
  });
}
