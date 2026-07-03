import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type { PosSession, SaleListItem, SaleResponse } from '@/lib/types';

export function useCurrentPosSession() {
  return useQuery({
    queryKey: QK.pos.currentSession,
    queryFn: () => getJson<PosSession>('/pos/sessions/current'),
    retry: false,
  });
}

export function useOpenPosSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (openingCash: number) =>
      postJson<PosSession>('/pos/sessions/open', { openingCash }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.cash.all });
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      memberId: string;
      discount?: number;
      cashReceived: number;
      creditReason?: string;
      dueDate?: string;
      items: Array<{ productId: string; quantity: number }>;
      payments?: Array<{ method: string; amount: number }>;
    }) => postJson<SaleResponse>('/pos/sales', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.inventory.all });
      queryClient.invalidateQueries({ queryKey: QK.cash.all });
      queryClient.invalidateQueries({ queryKey: QK.receivables.all });
      queryClient.invalidateQueries({ queryKey: QK.products.all, refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: QK.members.all, refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all, refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: QK.analytics.all, refetchType: 'inactive' });
    },
  });
}

export function useClosePosSession(sessionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { closingCash: number; discrepancyReason?: string; closingSignature?: string }) => {
      if (!sessionId) {
        throw new Error('No hay caja abierta');
      }

      return postJson<PosSession>(`/pos/sessions/${sessionId}/close`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.cash.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all });
      queryClient.invalidateQueries({ queryKey: QK.analytics.all });
    },
  });
}

export function useDispensations(enabled = true) {
  return useQuery({
    queryKey: QK.pos.sales,
    queryFn: () => getJson<SaleListItem[]>('/pos/sales'),
    enabled,
  });
}

export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      patchJson<{ ok: boolean }>(`/pos/sales/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.pos.sales });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.inventory.all });
      queryClient.invalidateQueries({ queryKey: QK.cash.all });
      queryClient.invalidateQueries({ queryKey: QK.receivables.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all, refetchType: 'inactive' });
    },
  });
}

export function useDispensationDetail(id?: string | null) {
  return useQuery({
    queryKey: QK.pos.sale(id ?? ''),
    queryFn: () => getJson<SaleListItem>(`/pos/sales/${id}`),
    enabled: Boolean(id),
  });
}
