import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, postJson } from '@/lib/api';
import { QK } from '@/lib/query-keys';

export type EmergencyStatus = {
  accessStatus: 'ENABLED' | 'DISABLED' | 'EMERGENCY_LOCKED' | 'MAINTENANCE' | string;
  activeEmergencyLock?: {
    id: string;
    status?: string;
    reason?: string | null;
    activatedAt?: string;
    activatedById?: string;
  } | null;
  accessLinks: {
    active: number;
    revoked: number;
  };
};

export type CurrentAccessLink = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
};

export type RegenerateAccessLinkResponse = {
  url: string;
  accessLink: CurrentAccessLink;
};

export type ActivateEmergencyInput = {
  reason?: string;
};

export const securityQueryKeys = {
  all: ['security'] as const,
  emergencyStatus: ['security', 'emergency-status'] as const,
  accessLink: ['security', 'access-link'] as const,
};

export function useEmergencyStatus(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: securityQueryKeys.emergencyStatus,
    queryFn: () => getJson<EmergencyStatus>('/security/emergency/status'),
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useCurrentAccessLink(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: securityQueryKeys.accessLink,
    queryFn: () => getJson<CurrentAccessLink>('/security/access-link/current'),
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useActivateEmergency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ActivateEmergencyInput) =>
      postJson('/security/emergency/activate', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: QK.settings.all });
      queryClient.invalidateQueries({ queryKey: QK.audit.all });
    },
  });
}

export function useDeactivateEmergency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postJson('/security/emergency/deactivate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: QK.settings.all });
      queryClient.invalidateQueries({ queryKey: QK.audit.all });
    },
  });
}

export function useRegenerateAccessLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      postJson<RegenerateAccessLinkResponse>('/security/access-link/regenerate'),
    onSuccess: (response) => {
      queryClient.setQueryData(securityQueryKeys.accessLink, response.accessLink);
      queryClient.invalidateQueries({ queryKey: securityQueryKeys.emergencyStatus, refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: QK.audit.all });
    },
  });
}
