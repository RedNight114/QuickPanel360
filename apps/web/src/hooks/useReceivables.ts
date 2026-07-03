import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type {
  CancelReceivableInput,
  MemberReceivablesResponse,
  PayReceivableInput,
  Receivable,
  ReceivablesSummary,
  ReceivableStatus,
} from '@/lib/types';

export type ReceivablesFilters = {
  status?: ReceivableStatus | 'all';
  memberId?: string;
  q?: string;
  take?: number;
};

function buildReceivablesQuery(filters: ReceivablesFilters = {}) {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.memberId) params.set('memberId', filters.memberId);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.take) params.set('take', String(filters.take));

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useReceivables(filters: ReceivablesFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.receivables.list(filters),
    queryFn: () => getJson<Receivable[]>(`/receivables${buildReceivablesQuery(filters)}`),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useReceivablesSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.receivables.summary,
    queryFn: () => getJson<ReceivablesSummary>('/receivables/summary'),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useMemberReceivables(memberId?: string, enabled = true) {
  return useQuery({
    queryKey: QK.receivables.member(memberId),
    queryFn: () => getJson<MemberReceivablesResponse>(`/receivables/member/${memberId}`),
    enabled: Boolean(memberId) && enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function usePayReceivable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayReceivableInput }) =>
      postJson(`/receivables/${id}/pay`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.receivables.all });
      queryClient.invalidateQueries({ queryKey: QK.cash.currentSummary });
      queryClient.invalidateQueries({ queryKey: ['cash', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.summary });
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useCreateReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { memberId: string; amount: number; reason?: string; dueDate?: string }) =>
      postJson<Receivable>('/receivables', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.receivables.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.summary });
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}

export function useApproveReceivable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patchJson(`/receivables/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.receivables.all });
    },
  });
}

export function useCancelReceivable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelReceivableInput }) =>
      patchJson(`/receivables/${id}/cancel`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.receivables.all });
      queryClient.invalidateQueries({ queryKey: QK.cash.currentSummary });
      queryClient.invalidateQueries({ queryKey: ['cash', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.summary });
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    },
  });
}
