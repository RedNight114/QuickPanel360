'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { readStoredAuth } from '@/lib/auth';
import { chatKeys } from './useChat';
import { playSound } from './useSound';

type ChatEvent = {
  conversationId: string;
  event: 'message.created' | 'message.deleted' | 'message.updated' | 'conversation.updated';
};

type TypingEvent = {
  conversationId: string;
  userId: string;
  name: string;
  typing: boolean;
};

type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type RealtimeState = {
  status: RealtimeStatus;
  lastError: string | null;
  reconnect: () => void;
  typingUsers: string[];
  emitTyping: (conversationId: string, typing: boolean) => void;
};

function refreshConversationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  currentConversationId: string | null | undefined,
  changedConversationId: string,
) {
  const isActiveConversation = currentConversationId === changedConversationId;

  queryClient.refetchQueries({
    queryKey: chatKeys.conversations,
  });

  if (isActiveConversation) {
    queryClient.refetchQueries({
      queryKey: chatKeys.messages(changedConversationId),
    });
    return;
  }

  queryClient.invalidateQueries({
    queryKey: chatKeys.messages(changedConversationId),
    refetchType: 'inactive',
  });
}

function resolveSocketUrl() {
  const configured =
    process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    '';

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return configured.replace(/\/+$/, '');
    }
  }

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(':3001', ':3000');
  }

  return 'http://localhost:3000';
}

export function canUseChatNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestChatNotificationPermission() {
  if (!canUseChatNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  return Notification.requestPermission();
}

export function useChatRealtime(conversationId?: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>(enabled ? 'connecting' : 'idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Clear typing users when conversation changes
  useEffect(() => {
    setTypingUsers([]);
  }, [conversationId]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setLastError(null);
      return undefined;
    }

    const token = readStoredAuth()?.accessToken;
    if (!token) {
      setStatus('disconnected');
      setLastError('Tu sesión no está disponible para abrir el chat.');
      return undefined;
    }

    setStatus('connecting');
    setLastError(null);
    const socket: Socket = io(`${resolveSocketUrl()}/chat`, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
    });

    socketRef.current = socket;

    socket.io.on('reconnect_attempt', () => {
      setStatus('reconnecting');
      setLastError('Reconectando el chat en tiempo real...');
    });

    socket.on('connect', () => {
      setStatus('connected');
      setLastError(null);
    });
    socket.on('disconnect', () => {
      setStatus('disconnected');
      setLastError('Sin conexion en tiempo real.');
      setTypingUsers([]);
      socketRef.current = null;
    });
    socket.on('connect_error', () => {
      setStatus('disconnected');
      setLastError('No se pudo conectar con el chat en tiempo real.');
    });

    socket.on('chat:event', (payload: ChatEvent) => {
      refreshConversationQueries(queryClient, conversationId, payload.conversationId);

      if (payload.event === 'message.updated') {
        refreshConversationQueries(queryClient, conversationId, payload.conversationId);
      }

      if (payload.event === 'message.created') {
        // Play sound for incoming messages in the active conversation
        playSound('message');

        if (
          canUseChatNotifications() &&
          Notification.permission === 'granted' &&
          document.visibilityState !== 'visible'
        ) {
          new Notification('Chat interno', {
            body: 'Tienes un mensaje nuevo.',
            tag: `chat-${payload.conversationId}`,
          });
        }
      }
    });

    socket.on('chat:mention', (payload: { conversationId: string; messageId: string; mentionedBy: string }) => {
      playSound('alert');
      toast(`${payload.mentionedBy} te ha mencionado`, {
        description: 'Revisa el chat para ver el mensaje.',
        duration: 5000,
      });
      refreshConversationQueries(queryClient, conversationId, payload.conversationId);
    });

    socket.on('chat:typing', (payload: TypingEvent) => {
      if (payload.conversationId !== conversationId) return;
      setTypingUsers((prev) => {
        if (payload.typing) {
          return prev.includes(payload.name) ? prev : [...prev, payload.name];
        }
        return prev.filter((n) => n !== payload.name);
      });
    });

    if (conversationId) {
      socket.emit('chat:join', { conversationId });
    }

    return () => {
      if (conversationId) {
        socket.emit('chat:leave', { conversationId });
      }
      setStatus('disconnected');
      socketRef.current = null;
      socket.disconnect();
    };
  }, [connectionAttempt, conversationId, enabled, queryClient]);

  const emitTyping = (convId: string, typing: boolean) => {
    socketRef.current?.emit('chat:typing', { conversationId: convId, typing });
  };

  return {
    status,
    lastError,
    reconnect: () => setConnectionAttempt((current) => current + 1),
    typingUsers,
    emitTyping,
  } satisfies RealtimeState;
}
