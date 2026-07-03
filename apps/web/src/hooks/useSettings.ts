import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';
import type { SettingsResponse, UpdateSettingsInput } from '@/lib/types';

export function useSettings(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: QK.settings.all,
    queryFn: () => getJson<SettingsResponse>('/settings'),
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateSettingsInput) =>
      patchJson<SettingsResponse>('/settings', body),
    onSuccess: (response) => {
      queryClient.setQueryData(QK.settings.all, response);
    },
  });
}
