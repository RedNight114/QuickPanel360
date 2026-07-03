import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type {
  CashCurrentSummary,
  CashMovement,
  CashMovementType,
  CashSessionDetail,
  CashSessionSummary,
  CreateCashMovementInput,
} from '@/lib/types';

export type CashMovementsFilters = {
  sessionId?: string;
  type?: CashMovementType | 'all';
  dateFrom?: string;
  dateTo?: string;
  take?: number;
};

export type CashSessionsFilters = {
  status?: string | 'all';
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
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

export function useCashCurrentSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.cash.currentSummary,
    queryFn: () => getJson<CashCurrentSummary>('/cash/current-summary'),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCashMovements(filters: CashMovementsFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.cash.movements(filters),
    queryFn: () => getJson<CashMovement[]>(`/cash/movements${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCashSessions(filters: CashSessionsFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.cash.sessions(filters),
    queryFn: () => getJson<CashSessionSummary[]>(`/cash/sessions${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCashSessionDetail(id?: string | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.cash.sessionDetail(id),
    queryFn: () => getJson<CashSessionDetail>(`/cash/sessions/${id}`),
    enabled: Boolean(id) && (options.enabled ?? true),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCashMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateCashMovementInput) => postJson('/cash/movements', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.cash.currentSummary });
      queryClient.invalidateQueries({ queryKey: ['cash', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.summary });
    },
  });
}
