import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ChatConversation, ChatMessage, ChatMessageReaction, ChatParticipantRole } from '@/lib/types';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  archivedConversations: ['chat', 'conversations', 'archived'] as const,
  collaborators: ['chat', 'collaborators'] as const,
  messages: (conversationId?: string | null) => ['chat', 'messages', conversationId] as const,
};

function upsertConversation(
  conversations: ChatConversation[] | undefined,
  conversation: ChatConversation,
) {
  if (!conversations?.length) {
    return [conversation];
  }

  const next = conversations.filter((item) => item.id !== conversation.id);
  next.unshift(conversation);
  return next;
}

function removeConversation(
  conversations: ChatConversation[] | undefined,
  conversationId: string,
) {
  return conversations?.filter((item) => item.id !== conversationId) ?? conversations;
}

function patchConversation(
  conversations: ChatConversation[] | undefined,
  conversationId: string,
  patch: Partial<ChatConversation>,
) {
  return conversations?.map((item) =>
    item.id === conversationId ? { ...item, ...patch } : item,
  ) ?? conversations;
}

function upsertMessage(messages: ChatMessage[] | undefined, message: ChatMessage) {
  if (!messages?.length) {
    return [message];
  }

  const existingIndex = messages.findIndex((item) => item.id === message.id);
  if (existingIndex === -1) {
    return [...messages, message];
  }

  return messages.map((item) => (item.id === message.id ? message : item));
}

export function useChatConversations(enabled = true) {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: () => apiFetch<ChatConversation[]>('/chat/conversations'),
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useChatCollaborators(enabled = true) {
  return useQuery({
    queryKey: chatKeys.collaborators,
    queryFn: () =>
      apiFetch<
        Array<{
          userId: string;
          name: string;
          email: string;
          role: string;
          status: string;
        }>
      >('/chat/collaborators'),
    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useChatMessages(conversationId?: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: () =>
      apiFetch<ChatMessage[]>(
        `/chat/conversations/${conversationId}/messages?take=50`,
      ),
    enabled: Boolean(conversationId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCreateDirectConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { userId: string }) =>
      apiFetch<ChatConversation>('/chat/conversations/direct', {
        method: 'POST',
        body,
      }),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => upsertConversation(current, conversation),
      );
    },
  });
}

export function useCreateGroupConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; participantIds: string[] }) =>
      apiFetch<ChatConversation>('/chat/conversations/group', {
        method: 'POST',
        body,
      }),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => upsertConversation(current, conversation),
      );
    },
  });
}

export function useSendChatMessage(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { body: string; clientEncryptedPayload?: unknown; replyToId?: string }) =>
      apiFetch<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body,
      }),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(conversationId),
        (current) => upsertMessage(current, message),
      );
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) =>
          conversationId
            ? patchConversation(current, conversationId, {
                lastMessage: message,
                updatedAt: message.createdAt,
              })
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations,
        refetchType: 'inactive',
      });
    },
  });
}

export function useMarkChatRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/read`, {
        method: 'POST',
      }),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => patchConversation(current, conversationId, { unreadCount: 0 }),
      );
    },
  });
}

export function useEditChatMessage(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      apiFetch<ChatMessage>(`/chat/messages/${messageId}`, {
        method: 'PATCH',
        body: { body },
      }),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(conversationId),
        (current) => upsertMessage(current, message),
      );
    },
  });
}

export function useTogglePin(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch<ChatMessage>(`/chat/messages/${messageId}/pin`, { method: 'PATCH' }),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(conversationId),
        (current) => upsertMessage(current, message),
      );
    },
  });
}

export function usePinnedMessages(conversationId?: string | null) {
  return useQuery({
    queryKey: ['chat', 'pinned', conversationId] as const,
    queryFn: () => apiFetch<ChatMessage[]>(`/chat/conversations/${conversationId}/pinned`),
    enabled: Boolean(conversationId),
  });
}

export function useDeleteChatMessage(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch<ChatMessage>(`/chat/messages/${messageId}`, {
        method: 'DELETE',
      }),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(conversationId),
        (current) => upsertMessage(current, message),
      );
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) =>
          conversationId
            ? patchConversation(current, conversationId, { lastMessage: message })
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations,
        refetchType: 'inactive',
      });
    },
  });
}

export function useAddChatParticipants(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { userIds: string[] }) =>
      apiFetch<ChatConversation>(`/chat/conversations/${conversationId}/participants`, {
        method: 'POST',
        body,
      }),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => upsertConversation(current, conversation),
      );
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(conversationId),
        refetchType: 'active',
      });
    },
  });
}

export function useRemoveChatParticipant(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<ChatConversation>(`/chat/conversations/${conversationId}/participants/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => upsertConversation(current, conversation),
      );
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(conversationId),
        refetchType: 'active',
      });
    },
  });
}

export function useLeaveChatGroup(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/leave`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      if (!conversationId) return;
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => removeConversation(current, conversationId),
      );
      queryClient.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      queryClient.invalidateQueries({
        queryKey: chatKeys.archivedConversations,
        refetchType: 'inactive',
      });
    },
  });
}

export function useSearchChatMessages(conversationId?: string | null, q?: string) {
  return useQuery({
    queryKey: ['chat', 'search', conversationId, q] as const,
    queryFn: () =>
      apiFetch<ChatMessage[]>(
        `/chat/conversations/${conversationId}/messages/search?q=${encodeURIComponent(q ?? '')}&take=30`,
      ),
    enabled: Boolean(conversationId) && Boolean(q?.trim()),
    staleTime: 30_000,
  });
}

export function useChatArchivedConversations(enabled = true) {
  return useQuery({
    queryKey: chatKeys.archivedConversations,
    queryFn: () => apiFetch<ChatConversation[]>('/chat/archived-conversations'),
    enabled,
  });
}

export function useArchiveChatConversation(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/archive`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      if (!conversationId) return;
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => removeConversation(current, conversationId),
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.archivedConversations });
    },
  });
}

export function useUnarchiveChatConversation(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/unarchive`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      queryClient.invalidateQueries({
        queryKey: chatKeys.archivedConversations,
        refetchType: 'active',
      });
    },
  });
}

export function useDeleteChatConversation(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      if (!conversationId) return;
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => removeConversation(current, conversationId),
      );
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.archivedConversations,
        (current) => removeConversation(current, conversationId),
      );
      queryClient.removeQueries({ queryKey: chatKeys.messages(conversationId) });
    },
  });
}

export function useMuteChatConversation(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { muted: boolean }) =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/mute`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations,
        refetchType: 'active',
      });
    },
  });
}

export function useUpdateChatParticipantRole(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: ChatParticipantRole }) =>
      apiFetch<ChatConversation>(
        `/chat/conversations/${conversationId}/participants/${input.userId}/role`,
        {
          method: 'PATCH',
          body: { role: input.role },
        },
      ),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => upsertConversation(current, conversation),
      );
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(conversationId),
        refetchType: 'active',
      });
    },
  });
}

export type ChatDeviceKey = {
  id: string;
  deviceId: string;
  deviceName: string | null;
  userAgent: string | null;
  publicKey: string;
  algorithm: string;
  active: boolean;
  createdAt: string;
  lastSeenAt: string | null;
};

export function useChatDeviceKeys(enabled = true) {
  return useQuery({
    queryKey: ['chat', 'device-keys'] as const,
    queryFn: () => apiFetch<ChatDeviceKey[]>('/chat/device-keys'),
    enabled,
    staleTime: 30_000,
  });
}

export function useRevokeChatDeviceKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      apiFetch<{ ok: boolean }>(`/chat/device-keys/${deviceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'device-keys'] });
    },
  });
}

export function useToggleReaction(conversationId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiFetch<ChatMessage>(`/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        body: { emoji },
      }),
    onSuccess: (updated) => {
      // Optimistically update the cached message list
      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(conversationId),
        (old) =>
          old?.map((m) =>
            m.id === updated.id
              ? { ...m, reactions: updated.reactions }
              : m,
          ) ?? old,
      );
    },
  });
}

// Re-export type for consumers
export type { ChatMessageReaction };

// Generic versions — pass conversationId as argument (for sidebar row actions)
export function useArchiveAnyConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/archive`, { method: 'PATCH' }),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => removeConversation(current, conversationId),
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.archivedConversations });
    },
  });
}

export function useUnarchiveAnyConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/unarchive`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      queryClient.invalidateQueries({
        queryKey: chatKeys.archivedConversations,
        refetchType: 'active',
      });
    },
  });
}

export function useDeleteAnyConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}`, { method: 'DELETE' }),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.conversations,
        (current) => removeConversation(current, conversationId),
      );
      queryClient.setQueryData<ChatConversation[]>(
        chatKeys.archivedConversations,
        (current) => removeConversation(current, conversationId),
      );
      queryClient.removeQueries({ queryKey: chatKeys.messages(conversationId) });
    },
  });
}
