import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson, patchJson } from '@/lib/api';
import type { UserPermission } from '@/lib/types';

export function useUserPermissions(tenantUserId?: string) {
  return useQuery({
    queryKey: ['users', 'permissions', tenantUserId],
    queryFn: () => getJson<UserPermission[]>(`/users/${tenantUserId}/permissions`),
    enabled: Boolean(tenantUserId),
  });
}

export function useUpdateUserPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantUserId, permissionKey, allowed }: { tenantUserId: string; permissionKey: string; allowed: boolean | null }) =>
      patchJson(`/users/${tenantUserId}/permissions`, { permissionKey, allowed }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'permissions', vars.tenantUserId] });
    },
  });
}
