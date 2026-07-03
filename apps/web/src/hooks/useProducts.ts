import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteJson, getJson, patchJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type { Product, ProductCategory } from '@/lib/types';

export function useProducts(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.products.all,
    queryFn: () => getJson<Product[]>('/products'),
    enabled: options.enabled ?? true,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: QK.products.categories,
    queryFn: () => getJson<ProductCategory[]>('/products/categories'),
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      postJson<ProductCategory>('/products/categories', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.products.categories });
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; description?: string; status?: string } }) =>
      patchJson<ProductCategory>(`/products/categories/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.products.categories });
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJson(`/products/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.products.categories });
      queryClient.invalidateQueries({ queryKey: QK.products.all });
    },
  });
}
