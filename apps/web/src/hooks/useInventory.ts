import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type { InventoryItem, InventoryMovement } from '@/lib/types';

export function useInventory(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.inventory.all,
    queryFn: () => getJson<InventoryItem[]>('/inventory'),
    enabled: options.enabled ?? true,
  });
}

export function useInventoryMovements(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.inventory.movements,
    queryFn: () => getJson<InventoryMovement[]>('/inventory/movements'),
    enabled: options.enabled ?? true,
  });
}

type AddStockPayload = {
  productId: string;
  // For UNIT products: send quantity
  quantity?: number;
  // For KG products: send quantityKg + quantityGrams (omit quantity to avoid @Min rejection)
  quantityKg?: number;
  quantityGrams?: number;
  reason?: string;
  unitCost?: number;
  notes?: string;
  batchCode?: string;
};

export function useAddStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, ...body }: AddStockPayload) =>
      postJson(`/inventory/${productId}/add`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.inventory.all });
      queryClient.invalidateQueries({ queryKey: QK.products.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all, refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: QK.analytics.all, refetchType: 'inactive' });
    },
  });
}

type AdjustStockPayload = {
  productId: string;
  newQuantity?: number;
  newQuantityKg?: number;
  newQuantityGrams?: number;
  reason: string;
  notes?: string;
};

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, ...body }: AdjustStockPayload) =>
      postJson(`/inventory/${productId}/adjust`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.inventory.all });
      queryClient.invalidateQueries({ queryKey: QK.products.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all, refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: QK.analytics.all, refetchType: 'inactive' });
    },
  });
}

type WasteStockPayload = {
  productId: string;
  quantity?: number;
  quantityKg?: number;
  quantityGrams?: number;
  reason: string;
  notes?: string;
};

export function useWasteStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, ...body }: WasteStockPayload) =>
      postJson(`/inventory/${productId}/waste`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.inventory.all });
      queryClient.invalidateQueries({ queryKey: QK.products.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all, refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: QK.analytics.all, refetchType: 'inactive' });
    },
  });
}
