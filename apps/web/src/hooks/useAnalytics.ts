import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type { AnalyticsCollaboratorsResponse, AnalyticsSummary, ProductPerformance, MemberSpending, InventoryTrends } from '@/lib/types';

export type AnalyticsFilters = {
  dateFrom?: string;
  dateTo?: string;
};

function buildQuery(filters: AnalyticsFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return;
    params.set(key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useAnalyticsSummary(filters: AnalyticsFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.analytics.summary(filters),
    queryFn: () => getJson<AnalyticsSummary>(`/analytics/summary${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAnalyticsCollaborators(
  filters: AnalyticsFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: QK.analytics.collaborators(filters),
    queryFn: () =>
      getJson<AnalyticsCollaboratorsResponse>(
        `/analytics/collaborators${buildQuery(filters)}`,
      ),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProductPerformance(
  filters: AnalyticsFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['analytics', 'products', filters],
    queryFn: () => getJson<ProductPerformance[]>(`/analytics/products${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useMemberSpending(
  filters: AnalyticsFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['analytics', 'members', filters],
    queryFn: () => getJson<MemberSpending[]>(`/analytics/members${buildQuery(filters)}`),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useInventoryTrends(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['analytics', 'inventory'],
    queryFn: () => getJson<InventoryTrends>('/analytics/inventory'),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
