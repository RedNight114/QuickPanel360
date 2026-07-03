import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type {
  CancelThirdPartyPaymentInput,
  CreateThirdPartyPaymentInput,
  ThirdPartyPayment,
  ThirdPartyPaymentCategory,
  ThirdPartyPaymentStatus,
} from '@/lib/types';

export type ThirdPartyPaymentsFilters = {
  q?: string;
  thirdPartyId?: string;
  category?: ThirdPartyPaymentCategory | 'all';
  status?: ThirdPartyPaymentStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  take?: number;
};

function buildQuery(filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useThirdPartyPayments(filters: ThirdPartyPaymentsFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.thirdPartyPayments.list(filters),
    queryFn: () =>
      getJson<ThirdPartyPayment[]>(`/third-party-payments${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateThirdPartyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateThirdPartyPaymentInput) =>
      postJson('/third-party-payments', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.thirdPartyPayments.all });
      queryClient.invalidateQueries({ queryKey: QK.cash.currentSummary });
      queryClient.invalidateQueries({ queryKey: ['cash', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.summary });
    },
  });
}

export function useCancelThirdPartyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelThirdPartyPaymentInput }) =>
      patchJson(`/third-party-payments/${id}/cancel`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.thirdPartyPayments.all });
      queryClient.invalidateQueries({ queryKey: QK.cash.currentSummary });
      queryClient.invalidateQueries({ queryKey: ['cash', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.summary });
    },
  });
}
