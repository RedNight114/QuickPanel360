import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type { DashboardSummary } from '@/lib/types';

export function useDashboardSummary(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.dashboard.summary,
    queryFn: () => getJson<DashboardSummary>('/dashboard/summary'),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
