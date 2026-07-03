import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ChatConversation } from '@/lib/types';

type SupportConversation = ChatConversation & {
  assignedToId?: string | null;
  tenant?: { id: string; name: string };
  assignedTo?: { id: string; name: string; email: string } | null;
  participants?: Array<{ userId: string; lastReadAt?: string | null; user?: { id: string; name: string; email?: string } }>;
  messages?: Array<{ body?: string; createdAt?: string; sender?: { id?: string; name: string } | null }>;
};

const supportKeys = {
  mine: ['support-chat', 'mine'] as const,
  all: ['support-chat', 'all'] as const,
};

export function useMySupportChat(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: supportKeys.mine,
    queryFn: () => apiFetch<SupportConversation | null>('/chat/support/mine'),
    enabled: options.enabled ?? true,
  });
}

export function useCreateSupportChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<SupportConversation>('/chat/support', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.mine });
    },
  });
}

export function useSupportChats(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: supportKeys.all,
    queryFn: () => apiFetch<SupportConversation[]>('/chat/support/all'),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useAssignSupportChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch<SupportConversation>(`/chat/support/${conversationId}/assign`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}

type PlatformCollaborator = {
  userId: string;
  user: { id: string; name: string; email: string };
};

const platformKeys = {
  collaborators: ['platform-chat', 'collaborators'] as const,
  conversations: ['platform-chat', 'conversations'] as const,
};

export function usePlatformCollaborators(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: platformKeys.collaborators,
    queryFn: () =>
      apiFetch<PlatformCollaborator[]>('/chat/support/platform/collaborators'),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export function usePlatformConversations(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: platformKeys.conversations,
    queryFn: () =>
      apiFetch<SupportConversation[]>('/chat/support/platform/conversations'),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCreatePlatformConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<SupportConversation>('/chat/support/platform/conversations', {
        method: 'POST',
        body: { userId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformKeys.conversations });
    },
  });
}
