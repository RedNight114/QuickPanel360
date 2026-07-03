import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson, postJson } from '@/lib/api';
import type {
  CreateThirdPartyInput,
  ThirdParty,
  ThirdPartyStatus,
  ThirdPartyType,
  UpdateThirdPartyInput,
} from '@/lib/types';

export type ThirdPartiesFilters = {
  q?: string;
  type?: ThirdPartyType | 'all';
  status?: ThirdPartyStatus | 'all';
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

export function useThirdParties(filters: ThirdPartiesFilters = {}) {
  return useQuery({
    queryKey: ['third-parties', filters],
    queryFn: () => getJson<ThirdParty[]>(`/third-parties${buildQuery(filters)}`),
  });
}

export function useCreateThirdParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateThirdPartyInput) => postJson<ThirdParty>('/third-parties', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['third-parties'] });
    },
  });
}

export function useUpdateThirdParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateThirdPartyInput }) =>
      patchJson<ThirdParty>(`/third-parties/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['third-parties'] });
    },
  });
}

export function useArchiveThirdParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patchJson<ThirdParty>(`/third-parties/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['third-parties'] });
    },
  });
}
