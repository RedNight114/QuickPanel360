import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';
import type { AuditLog } from '@/lib/types';

export function useSecurityAuditLogs(options: { enabled?: boolean; take?: number } = {}) {
  const take = options.take ?? 50;
  return useQuery({
    queryKey: ['audit', 'security-logs', take],
    queryFn: () => getJson<AuditLog[]>(`/audit/logs?take=${take}`),
    enabled: options.enabled ?? true,
  });
}
