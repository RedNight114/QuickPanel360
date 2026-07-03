'use client';

import { Fragment, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import {
  ArrowLeft,
  Archive,
  ArchiveX,
  Bell,
  BellOff,
  Check,
  CornerUpLeft,
  Download,
  Pencil,
  Pin,
  PinOff,
  KeyRound,
  Lock,
  MoreVertical,
  PenSquare,
  RefreshCw,
  Settings,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Trash2,
  Upload,
  Users,
  Headphones,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { SectionErrorBoundary } from '@/components/errors/section-error-boundary';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { ApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { ChatConversation, ChatMessage } from '@/lib/types';
import {
  useArchiveChatConversation,
  useChatArchivedConversations,
  useChatCollaborators,
  useChatConversations,
  useAddChatParticipants,
  useChatMessages,
  useCreateDirectConversation,
  useCreateGroupConversation,
  useDeleteChatConversation,
  useDeleteChatMessage,
  useEditChatMessage,
  useLeaveChatGroup,
  useMarkChatRead,
  useRemoveChatParticipant,
  useSendChatMessage,
  useMuteChatConversation,
  useUnarchiveChatConversation,
  useUpdateChatParticipantRole,
  useToggleReaction,
  useArchiveAnyConversation,
  useUnarchiveAnyConversation,
  useDeleteAnyConversation,
  useSearchChatMessages,
  useTogglePin,
  usePinnedMessages,
} from '@/hooks/useChat';
import { useCreateSupportChat, useMySupportChat } from '@/hooks/useSupportChat';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { requestChatNotificationPermission } from '@/hooks/useChatRealtime';
import {
  createClientEncryptedPayload,
  decryptClientEncryptedPayload,
  exportChatDeviceKeyBackup,
  getCurrentChatDeviceId,
  importChatDeviceKeyBackup,
  resetCurrentChatDeviceKey,
  rotateCurrentChatDeviceKey,
  useChatConversationDeviceKeys,
  useChatDeviceKey,
  useChatDeviceKeys,
  useRevokeChatDeviceKey,
} from '@/hooks/useChatDeviceKey';
import { useAuth } from '@/providers/auth-provider';

type Filter = 'all' | 'unread' | 'direct' | 'group';
type SidebarView = 'active' | 'archived';

// ─── Helper functions ────────────────────────────────────────────────────────

function collaboratorRoleLabel(role?: string | null) {
  if (role === 'OWNER') return 'Propietario';
  if (role === 'MANAGER') return 'Manager';
  if (role === 'EMPLOYEE') return 'Colaborador';
  return role ?? 'Colaborador';
}

function shallowEqualRecord(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

function initials(name?: string | null) {
  return (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatTime(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDaySeparator(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Hoy';
  if (isSameDay(date, yesterday)) return 'Ayer';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

function conversationTitle(conversation: ChatConversation, currentUserId?: string) {
  if (conversation.type === 'GROUP') {
    return conversation.title || 'Grupo interno';
  }

  const other = conversation.participants.find(
    (participant) => participant.userId !== currentUserId,
  );

  return other?.user.name ?? 'Conversación directa';
}

function participantLine(conversation: ChatConversation, currentUserId?: string) {
  const users = conversation.participants
    .filter((participant) => participant.userId !== currentUserId || conversation.type === 'GROUP')
    .map((participant) => participant.user.name);

  return users.slice(0, 4).join(', ') + (users.length > 4 ? ` +${users.length - 4}` : '');
}

function formatRelativeTime(value?: string | null) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(new Date(value));
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(value));
}

const AVATAR_COLORS = [
  'bg-amber-100 text-[#15140F]',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

function avatarColor(name?: string | null) {
  const code = (name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ─── Decryption hook ─────────────────────────────────────────────────────────

function useClientDecryptedMessages(messages: ChatMessage[]) {
  const [decryptedBodies, setDecryptedBodies] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    if (messages.length === 0) {
      setDecryptedBodies((current) =>
        Object.keys(current).length === 0 ? current : {},
      );
      return () => {
        cancelled = true;
      };
    }

    async function decryptMessages() {
      const entries = await Promise.all(
        messages
          .filter((message) => message.clientEncryptedPayload && !message.deleted)
          .map(async (message) => {
            const body = await decryptClientEncryptedPayload(
              message.clientEncryptedPayload,
            ).catch(() => null);

            return body ? ([message.id, body] as const) : null;
          }),
      );

      if (!cancelled) {
        const validEntries = entries.filter(
          (entry): entry is readonly [string, string] => Boolean(entry),
        );
        const nextBodies = Object.fromEntries(validEntries);
        setDecryptedBodies((current) =>
          shallowEqualRecord(current, nextBodies) ? current : nextBodies,
        );
      }
    }

    decryptMessages();

    return () => {
      cancelled = true;
    };
  }, [messages]);

  return useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        body: decryptedBodies[message.id] ?? message.body,
      })),
    [decryptedBodies, messages],
  );
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user, hasPermission } = useAuth();
  const currentUserId = user?.id;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>('active');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canView = hasPermission('chat.view');
  const canCreate = hasPermission('chat.create');
  const canSend = hasPermission('chat.send');

  const canManage = hasPermission('chat.manage');
  const conversationsQuery = useChatConversations(canView);
  const archivedQuery = useChatArchivedConversations(canView && sidebarView === 'archived');
  const mySupportChatQuery = useMySupportChat({ enabled: canView });
  const createSupportChat = useCreateSupportChat();
  const conversations = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  );
  const archivedConversations = useMemo(
    () => archivedQuery.data ?? [],
    [archivedQuery.data],
  );
  const selectedConversation =
    conversations.find((c) => c.id === selectedId) ??
    archivedConversations.find((c) => c.id === selectedId) ??
    (sidebarView === 'archived' ? archivedConversations[0] : conversations[0]) ??
    null;
  const activeId = selectedId ?? selectedConversation?.id ?? null;
  const isArchivedView = sidebarView === 'archived';
  const messagesQuery = useChatMessages(activeId);
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const deviceKeysQuery = useChatConversationDeviceKeys(activeId);
  const sendMessage = useSendChatMessage(activeId);
  const markRead = useMarkChatRead();
  const deleteMessage = useDeleteChatMessage(activeId);
  const editMessage = useEditChatMessage(activeId);
  const togglePin = useTogglePin(activeId);
  const pinnedQuery = usePinnedMessages(activeId);
  const pinnedMessages = pinnedQuery.data ?? [];
  const toggleReaction = useToggleReaction(activeId);
  const leaveGroup = useLeaveChatGroup(activeId);
  const archiveAny = useArchiveAnyConversation();
  const unarchiveAny = useUnarchiveAnyConversation();
  const deleteAny = useDeleteAnyConversation();
  const archiveConversation = useArchiveChatConversation(activeId);
  const unarchiveConversation = useUnarchiveChatConversation(activeId);
  const deleteConversation = useDeleteChatConversation(activeId);
  const muteConversation = useMuteChatConversation(activeId);
  const currentParticipant = selectedConversation?.participants.find(
    (participant) => participant.userId === currentUserId,
  );
  const isConversationCreator = selectedConversation?.createdById === currentUserId;
  const canDeleteConversation = canManage || isConversationCreator || currentParticipant?.role === 'OWNER';
  const { status: realtimeStatus, lastError: realtimeError, reconnect: reconnectRealtime, typingUsers, emitTyping } =
    useChatRealtime(activeId, canView);
  useChatDeviceKey(canView);
  const displayedMessages = useClientDecryptedMessages(messages);

  const searchResults = useSearchChatMessages(
    searchOpen ? activeId : null,
    debouncedSearch,
  );

  // Encryption status: e2e if device keys exist for all participants, server if only server-side
  const encryptionStatus = useMemo<'e2e' | 'server' | 'none'>(() => {
    if (!selectedConversation || !activeId) return 'none';
    const keys = deviceKeysQuery.data;
    if (!keys || keys.length === 0) return 'server';
    const participantIds = new Set(
      selectedConversation.participants
        .filter((p) => p.userId !== currentUserId)
        .map((p) => p.userId),
    );
    const coveredIds = new Set(keys.map((k) => k.userId));
    const allCovered = [...participantIds].every((id) => coveredIds.has(id));
    return allCovered ? 'e2e' : 'server';
  }, [selectedConversation, activeId, deviceKeysQuery.data, currentUserId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages.length]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 5 + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [message]);

  // Click-outside for menu
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Click-outside for emoji picker
  useEffect(() => {
    if (!emojiOpen) return;
    function handleClick(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [emojiOpen]);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Clear reply and search when switching conversations
  useEffect(() => {
    setReplyingTo(null);
    setSearchOpen(false);
    setSearchQuery('');
    setDebouncedSearch('');
  }, [activeId]);

  useEffect(() => {
    if (activeId) {
      markRead.mutate(activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (filter === 'unread' && conversation.unreadCount <= 0) return false;
      if (filter === 'direct' && conversation.type !== 'DIRECT') return false;
      if (filter === 'group' && conversation.type !== 'GROUP') return false;

      if (!normalizedQuery) return true;

      return [
        conversationTitle(conversation, currentUserId),
        participantLine(conversation, currentUserId),
        conversation.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [conversations, currentUserId, filter, query]);

  function handleMessageChange(text: string) {
    setMessage(text);
    if (!activeId) return;
    // emit typing:true and debounce typing:false after 2.5s
    emitTyping(activeId, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitTyping(activeId, false);
    }, 2500);

    // Detect @mention query: find the last @ that is not followed by a space yet
    const match = text.slice(0, textareaRef.current?.selectionStart ?? text.length).match(/@([\w\sáéíóúàèìòùñüÁÉÍÓÚÀÈÌÒÙÑÜ]*)$/u);
    setMentionQuery(match ? match[1] : null);
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const body = message.trim();
    if (!activeId || !body || !canSend) return;

    // stop typing indicator immediately
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    emitTyping(activeId, false);

    try {
      const clientEncryptedPayload = await createClientEncryptedPayload(
        body,
        deviceKeysQuery.data ?? [],
      ).catch(() => null);

      await sendMessage.mutateAsync({
        body,
        ...(clientEncryptedPayload ? { clientEncryptedPayload } : {}),
        ...(replyingTo ? { replyToId: replyingTo.id } : {}),
      });
      setMessage('');
      setReplyingTo(null);
      setMentionQuery(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo enviar el mensaje.'));
    }
  }

  async function leaveSelectedGroup() {
    if (!activeId || !selectedConversation) return;

    const confirmed = window.confirm('¿Quieres salir de este grupo? Dejarás de ver sus nuevos mensajes.');
    if (!confirmed) return;

    try {
      await leaveGroup.mutateAsync();
      toast.success('Has salido del grupo.');
      setSelectedId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo salir del grupo.'));
    }
  }

  async function enableNotifications() {
    const permission = await requestChatNotificationPermission();

    if (permission === 'granted') {
      toast.success('Notificaciones activadas.');
    } else if (permission === 'denied') {
      toast.error('El navegador tiene las notificaciones bloqueadas.');
    } else if (permission === 'unsupported') {
      toast.error('Este navegador no soporta notificaciones.');
    }
  }

  async function archiveSelectedConversation() {
    if (!activeId) return;

    const confirmed = window.confirm('¿Archivar esta conversación? Se ocultará solo para tu usuario.');
    if (!confirmed) return;

    try {
      await archiveConversation.mutateAsync();
      toast.success('Conversación archivada.');
      setSelectedId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo archivar la conversación.'));
    }
  }

  async function unarchiveSelectedConversation() {
    if (!activeId) return;

    try {
      await unarchiveConversation.mutateAsync();
      toast.success('Conversación restaurada.');
      setSelectedId(null);
      setSidebarView('active');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo restaurar la conversación.'));
    }
  }

  async function deleteSelectedConversation() {
    if (!activeId) return;

    const confirmed = window.confirm(
      '¿Eliminar esta conversación permanentemente? Se borrarán todos los mensajes para todos los participantes. Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;

    try {
      await deleteConversation.mutateAsync();
      toast.success('Conversación eliminada.');
      setSelectedId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la conversación.'));
    }
  }

  async function toggleMuteSelectedConversation() {
    if (!currentParticipant) return;

    try {
      await muteConversation.mutateAsync({ muted: !currentParticipant.muted });
      toast.success(currentParticipant.muted ? 'Notificaciones activadas.' : 'Conversación silenciada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar la conversación.'));
    }
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(text), 400);
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
    setDebouncedSearch('');
  }

  function insertMention(name: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? message.length;
    const before = message.slice(0, cursor);
    const after = message.slice(cursor);
    // Replace the @query at the cursor with @name + space
    const replaced = before.replace(/@[\w\sáéíóúàèìòùñüÁÉÍÓÚÀÈÌÒÙÑÜ]*$/u, `@${name} `);
    const next = replaced + after;
    handleMessageChange(next);
    setMentionQuery(null);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(replaced.length, replaced.length);
    }, 0);
  }

  const handleComposerKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && mentionQuery !== null) {
      setMentionQuery(null);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, activeId, canSend, mentionQuery]);

  // Realtime dot
  const realtimeDotColor =
    realtimeStatus === 'connected'
      ? 'bg-amber-500'
      : realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting'
        ? 'bg-amber-400'
        : 'bg-slate-400';
  const realtimeDotPulse =
    realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting';
  const realtimeLabel =
    realtimeStatus === 'connected'
      ? 'Conectado'
      : realtimeStatus === 'connecting'
        ? 'Conectando...'
        : realtimeStatus === 'reconnecting'
          ? 'Reconectando...'
          : 'Sin conexión';

  if (!canView) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes acceso al chat interno." />
      </ProtectedLayout>
    );
  }

  const title = selectedConversation ? conversationTitle(selectedConversation, currentUserId) : null;
  const avatarCls = title ? avatarColor(title) : 'bg-brand-lighter text-brand-primary';

  return (
    <ProtectedLayout>
      <div className="-mx-3 -mt-3 sm:-mx-5 sm:-mt-4 h-[calc(100dvh-4rem)]">
        <div className="grid h-full overflow-hidden rounded-xl border border-border-light shadow-sm lg:grid-cols-[300px_1fr]">

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <SectionErrorBoundary
            compact
            title="No se pudo cargar la lista de conversaciones"
            message="Recarga esta sección para volver a intentarlo."
          >
            <aside
              className={`flex flex-col border-border-light bg-white lg:border-r ${
                activeId ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Sidebar header */}
              <div className="flex items-center gap-2 border-b border-border-light px-3 py-2.5">
                <span className="flex-1 text-base font-bold text-text-primary">Chat interno</span>
                <span
                  className={`relative flex h-2.5 w-2.5 items-center justify-center`}
                  title={realtimeLabel}
                >
                  {realtimeDotPulse ? (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${realtimeDotColor} opacity-60`} />
                  ) : null}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${realtimeDotColor}`} />
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                  title="Contactar soporte"
                  onClick={async () => {
                    if (mySupportChatQuery.data?.id) {
                      setSelectedId(mySupportChatQuery.data.id);
                    } else {
                      const chat = await createSupportChat.mutateAsync();
                      if (chat?.id) {
                        conversationsQuery.refetch();
                        setSelectedId(chat.id);
                      }
                    }
                  }}
                >
                  <Headphones size={16} />
                </button>
                {canCreate && sidebarView === 'active' ? (
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-text-muted hover:bg-bg-soft hover:text-text-primary"
                    onClick={() => setModalOpen(true)}
                    aria-label="Nueva conversación"
                  >
                    <PenSquare size={16} />
                  </button>
                ) : null}
              </div>

              {/* View toggle */}
              <div className="flex border-b border-border-light">
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold transition ${
                    sidebarView === 'active'
                      ? 'border-b-2 border-brand-primary text-brand-primary'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  onClick={() => { setSidebarView('active'); setSelectedId(null); }}
                >
                  Activas
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-xs font-semibold transition ${
                    sidebarView === 'archived'
                      ? 'border-b-2 border-brand-primary text-brand-primary'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  onClick={() => { setSidebarView('archived'); setSelectedId(null); }}
                >
                  Archivadas
                  {archivedConversations.length > 0 ? (
                    <span className="ml-1.5 rounded-full bg-bg-soft px-1.5 py-0.5 text-[10px] text-text-muted">
                      {archivedConversations.length}
                    </span>
                  ) : null}
                </button>
              </div>

              {/* Search + filters (only in active view) */}
              {sidebarView === 'active' ? (
                <div className="border-b border-border-light px-3 py-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-text-muted" size={14} />
                    <input
                      className="h-9 w-full rounded-lg border border-border-light bg-bg-soft pl-8 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                      placeholder="Buscar conversaciones"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                  <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                    {[
                      ['all', 'Todas'],
                      ['unread', 'No leídas'],
                      ['direct', 'Directos'],
                      ['group', 'Grupos'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          filter === value
                            ? 'border-brand-primary bg-brand-lighter text-brand-primary'
                            : 'border-border-light bg-white text-text-secondary'
                        }`}
                        onClick={() => setFilter(value as Filter)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto p-2">
                {sidebarView === 'active' ? (
                  <>
                    {conversationsQuery.isLoading ? (
                      <p className="p-3 text-sm text-text-muted">Cargando conversaciones...</p>
                    ) : conversationsQuery.isError ? (
                      <div className="p-3">
                        <EmptyState title="No se pudieron cargar las conversaciones." text="Comprueba tu conexión e inténtalo de nuevo." />
                        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => conversationsQuery.refetch()}>Reintentar</Button>
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="p-3">
                        <EmptyState title="No tienes conversaciones todavía." />
                      </div>
                    ) : (
                      filteredConversations.map((conversation) => {
                        const rowParticipant = conversation.participants.find((p) => p.userId === currentUserId);
                        const rowCanDelete = canManage || conversation.createdById === currentUserId || rowParticipant?.role === 'OWNER';
                        return (
                          <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            active={activeId === conversation.id}
                            currentUserId={currentUserId}
                            onClick={() => setSelectedId(conversation.id)}
                            onArchive={() => archiveAny.mutate(conversation.id)}
                            onDelete={rowCanDelete ? () => {
                              if (window.confirm('¿Eliminar esta conversación permanentemente? Se borrarán todos los mensajes. Esta acción no se puede deshacer.')) {
                                deleteAny.mutate(conversation.id);
                                if (activeId === conversation.id) setSelectedId(null);
                              }
                            } : undefined}
                            canDelete={rowCanDelete}
                          />
                        );
                      })
                    )}
                  </>
                ) : (
                  <>
                    {archivedQuery.isLoading ? (
                      <p className="p-3 text-sm text-text-muted">Cargando archivadas...</p>
                    ) : archivedConversations.length === 0 ? (
                      <div className="p-3">
                        <EmptyState title="No tienes conversaciones archivadas." />
                      </div>
                    ) : (
                      archivedConversations.map((conversation) => {
                        const rowParticipant = conversation.participants.find((p) => p.userId === currentUserId);
                        const rowCanDelete = canManage || conversation.createdById === currentUserId || rowParticipant?.role === 'OWNER';
                        return (
                          <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            active={activeId === conversation.id}
                            currentUserId={currentUserId}
                            onClick={() => setSelectedId(conversation.id)}
                            archived
                            onUnarchive={() => { unarchiveAny.mutate(conversation.id); if (activeId === conversation.id) setSelectedId(null); }}
                            onDelete={rowCanDelete ? () => {
                              if (window.confirm('¿Eliminar esta conversación permanentemente? Esta acción no se puede deshacer.')) {
                                deleteAny.mutate(conversation.id);
                                if (activeId === conversation.id) setSelectedId(null);
                              }
                            } : undefined}
                            canDelete={rowCanDelete}
                          />
                        );
                      })
                    )}
                  </>
                )}
              </div>
            </aside>
          </SectionErrorBoundary>

          {/* ── Conversation panel ──────────────────────────────────────── */}
          <SectionErrorBoundary
            compact
            title="No se pudo cargar la conversación"
            message="Recarga esta sección para volver a intentarlo."
          >
            <section className={`${activeId ? 'flex' : 'hidden lg:flex'} min-w-0 flex-col bg-slate-50`}>

              {selectedConversation ? (
                <>
                  {/* Disconnected banner */}
                  {realtimeStatus !== 'connected' ? (
                    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                      <span className="flex-1 truncate">
                        {realtimeStatus === 'reconnecting'
                          ? 'Reconectando...'
                          : realtimeError ?? 'Sin conexión en tiempo real.'}
                      </span>
                      <button
                        type="button"
                        className="flex shrink-0 items-center gap-1 font-semibold text-amber-900 underline"
                        onClick={reconnectRealtime}
                      >
                        <RefreshCw size={12} />
                        Reintentar
                      </button>
                    </div>
                  ) : null}

                  {/* Conversation header */}
                  <div className="flex items-center gap-2 border-b border-border-light bg-white px-3 py-2.5">
                    {/* Back (mobile) */}
                    <button
                      type="button"
                      className="lg:hidden -ml-1 rounded-lg p-1.5 text-text-muted hover:bg-bg-soft hover:text-text-primary"
                      onClick={() => setSelectedId(null)}
                      aria-label="Volver"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    {/* Avatar */}
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarCls}`}>
                      {selectedConversation.type === 'GROUP'
                        ? <Users size={16} />
                        : initials(title)}
                    </div>

                    {/* Name + subtitle */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text-primary">{title}</p>
                      <p className="truncate text-xs text-text-muted">
                        {selectedConversation.type === 'GROUP' ? 'Grupo' : 'Directa'} ·{' '}
                        {participantLine(selectedConversation, currentUserId)}
                      </p>
                    </div>

                    {/* Search button */}
                    <button
                      type="button"
                      aria-label="Buscar mensajes"
                      onClick={searchOpen ? closeSearch : openSearch}
                      className={`rounded-lg p-1.5 transition hover:bg-bg-soft ${
                        searchOpen ? 'bg-brand-lighter text-brand-primary' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Search size={17} />
                    </button>

                    {/* Encryption + connection status badges */}
                    <EncryptionBadge status={encryptionStatus} />
                    <ConnectionBadge realtimeStatus={realtimeStatus} onReconnect={reconnectRealtime} />

                    {/* Action icons */}
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-soft hover:text-text-primary"
                      onClick={toggleMuteSelectedConversation}
                      disabled={muteConversation.isPending}
                      aria-label={currentParticipant?.muted ? 'Activar notificaciones' : 'Silenciar'}
                    >
                      {currentParticipant?.muted ? <Bell size={17} /> : <BellOff size={17} />}
                    </button>

                    {/* More menu */}
                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-soft hover:text-text-primary"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        aria-label="Más opciones"
                      >
                        <MoreVertical size={17} />
                      </button>

                      {menuOpen ? (
                        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border-light bg-white shadow-lg">
                          {/* Archive / Unarchive */}
                          {isArchivedView ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                              onClick={() => { unarchiveSelectedConversation(); setMenuOpen(false); }}
                              disabled={unarchiveConversation.isPending}
                            >
                              <ArchiveX size={15} className="text-text-muted" />
                              Restaurar conversación
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                              onClick={() => { archiveSelectedConversation(); setMenuOpen(false); }}
                            >
                              <Archive size={15} className="text-text-muted" />
                              Archivar conversación
                            </button>
                          )}

                          {/* Group actions */}
                          {selectedConversation.type === 'GROUP' && selectedConversation.participants.length > 2 && !isArchivedView ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                              onClick={() => { leaveSelectedGroup(); setMenuOpen(false); }}
                              disabled={leaveGroup.isPending}
                            >
                              <Users size={15} className="text-text-muted" />
                              Salir del grupo
                            </button>
                          ) : null}
                          {selectedConversation.type === 'GROUP' && canManage ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                              onClick={() => { setManageOpen(true); setMenuOpen(false); }}
                            >
                              <Settings size={15} className="text-text-muted" />
                              Gestionar grupo
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                            onClick={() => { setDevicesOpen(true); setMenuOpen(false); }}
                          >
                            <KeyRound size={15} className="text-text-muted" />
                            Mis dispositivos
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                            onClick={() => { enableNotifications(); setMenuOpen(false); }}
                          >
                            <Bell size={15} className="text-text-muted" />
                            Activar notificaciones
                          </button>
                          {!isArchivedView ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                              onClick={() => { if (activeId) markRead.mutate(activeId); setMenuOpen(false); }}
                            >
                              <Check size={15} className="text-text-muted" />
                              Marcar como leído
                            </button>
                          ) : null}

                          {/* Delete — for conversation admins, creators or managers */}
                          {canDeleteConversation ? (
                            <>
                              <div className="my-1 border-t border-border-light" />
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                onClick={() => { deleteSelectedConversation(); setMenuOpen(false); }}
                                disabled={deleteConversation.isPending}
                              >
                                <Trash2 size={15} />
                                Eliminar conversación
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Search panel */}
                  {searchOpen ? (
                    <div className="border-b border-border-light bg-white">
                      {/* Search input */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Search size={15} className="shrink-0 text-text-muted" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                          placeholder="Buscar en esta conversación..."
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                        />
                        {searchQuery ? (
                          <button type="button" onClick={() => handleSearchChange('')} className="text-text-muted hover:text-text-primary">
                            <XCircle size={15} />
                          </button>
                        ) : null}
                        <button type="button" onClick={closeSearch} className="text-text-muted hover:text-text-primary">
                          <X size={15} />
                        </button>
                      </div>

                      {/* Results */}
                      {debouncedSearch.trim() ? (
                        <div className="max-h-72 overflow-y-auto border-t border-border-light">
                          {searchResults.isLoading ? (
                            <p className="px-4 py-3 text-sm text-text-muted">Buscando...</p>
                          ) : searchResults.isError ? (
                            <p className="px-4 py-3 text-sm text-red-500">Error al buscar.</p>
                          ) : (searchResults.data?.length ?? 0) === 0 ? (
                            <p className="px-4 py-3 text-sm text-text-muted">Sin resultados para <strong>{debouncedSearch}</strong>.</p>
                          ) : (
                            <>
                              <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                {searchResults.data!.length} resultado{searchResults.data!.length !== 1 ? 's' : ''}
                              </p>
                              {searchResults.data!.map((msg) => (
                                <SearchResultRow
                                  key={msg.id}
                                  message={msg}
                                  highlight={debouncedSearch}
                                />
                              ))}
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Pinned messages bar */}
                  {pinnedMessages.length > 0 ? (
                    <div className="border-b border-border-light bg-amber-50/50 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Pin size={12} className="shrink-0 text-amber-600" />
                        <span className="font-medium text-amber-800">
                          {pinnedMessages.length} mensaje{pinnedMessages.length !== 1 ? 's' : ''} fijado{pinnedMessages.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex-1 truncate text-amber-700">
                          — {pinnedMessages[0]?.sender?.name}: {pinnedMessages[0]?.body?.slice(0, 60)}{(pinnedMessages[0]?.body?.length ?? 0) > 60 ? '...' : ''}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Messages area */}
                  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                    {messagesQuery.isLoading ? (
                      <p className="text-center text-sm text-text-muted py-6">Cargando mensajes...</p>
                    ) : messagesQuery.isError ? (
                      <div className="py-6">
                        <EmptyState
                          title="No se pudieron cargar los mensajes."
                          text="Comprueba tu conexión e inténtalo de nuevo."
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => messagesQuery.refetch()}
                        >
                          Reintentar
                        </Button>
                      </div>
                    ) : displayedMessages.length === 0 ? (
                      <div className="py-6">
                        <EmptyState title="Todavía no hay mensajes." />
                      </div>
                    ) : (
                      displayedMessages.map((chatMessage, index) => {
                        const previous = displayedMessages[index - 1];
                        const showDaySeparator =
                          !previous ||
                          formatDaySeparator(chatMessage.createdAt) !==
                            formatDaySeparator(previous.createdAt);

                        // Message grouping
                        const prevMsg = displayedMessages[index - 1];
                        const nextMsg = displayedMessages[index + 1];
                        const sameAsPrev =
                          prevMsg &&
                          prevMsg.senderId === chatMessage.senderId &&
                          chatMessage.type !== 'SYSTEM' &&
                          prevMsg.type !== 'SYSTEM' &&
                          new Date(chatMessage.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 180000;
                        const sameAsNext =
                          nextMsg &&
                          nextMsg.senderId === chatMessage.senderId &&
                          chatMessage.type !== 'SYSTEM' &&
                          nextMsg.type !== 'SYSTEM' &&
                          new Date(nextMsg.createdAt).getTime() - new Date(chatMessage.createdAt).getTime() < 180000;
                        const isFirst = !sameAsPrev;
                        const isLast = !sameAsNext;

                        return (
                          <Fragment key={chatMessage.id}>
                            {showDaySeparator ? (
                              <div className="flex items-center justify-center py-3">
                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-text-muted shadow-sm border border-border-light">
                                  {formatDaySeparator(chatMessage.createdAt)}
                                </span>
                              </div>
                            ) : null}
                            <ModernMessageBubble
                              message={chatMessage}
                              mine={chatMessage.senderId === currentUserId}
                              currentUserId={currentUserId}
                              group={selectedConversation.type === 'GROUP'}
                              canDelete={
                                !chatMessage.deleted &&
                                (chatMessage.senderId === currentUserId || hasPermission('chat.manage'))
                              }
                              onDelete={() => deleteMessage.mutate(chatMessage.id)}
                              onReact={(emoji) => toggleReaction.mutate({ messageId: chatMessage.id, emoji })}
                              onReply={canSend && !chatMessage.deleted ? () => setReplyingTo(chatMessage) : undefined}
                              onEdit={
                                canSend && !chatMessage.deleted && chatMessage.senderId === currentUserId
                                  ? (newBody: string) => editMessage.mutate({ messageId: chatMessage.id, body: newBody })
                                  : undefined
                              }
                              onPin={canSend && !chatMessage.deleted ? () => togglePin.mutate(chatMessage.id) : undefined}
                              isFirst={isFirst}
                              isLast={isLast}
                            />
                          </Fragment>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Typing indicator */}
                  {typingUsers.length > 0 ? (
                    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-text-muted">
                      <span className="flex gap-0.5">
                        <span className="animate-bounce [animation-delay:0ms]">·</span>
                        <span className="animate-bounce [animation-delay:150ms]">·</span>
                        <span className="animate-bounce [animation-delay:300ms]">·</span>
                      </span>
                      <span>
                        {typingUsers.length === 1
                          ? `${typingUsers[0]} está escribiendo...`
                          : typingUsers.length === 2
                            ? `${typingUsers[0]} y ${typingUsers[1]} están escribiendo...`
                            : 'Varios están escribiendo...'}
                      </span>
                    </div>
                  ) : null}

                  {/* @mention autocomplete dropdown */}
                  {mentionQuery !== null && selectedConversation ? (
                    <MentionDropdown
                      query={mentionQuery}
                      participants={selectedConversation.participants.filter(
                        (p) => p.userId !== currentUserId,
                      )}
                      onSelect={insertMention}
                    />
                  ) : null}

                  {/* Reply preview banner */}
                  {replyingTo ? (
                    <div className="flex items-center gap-2 border-t border-border-light bg-bg-soft px-3 py-2">
                      <CornerUpLeft size={14} className="shrink-0 text-brand-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-brand-primary">
                          {replyingTo.sender?.name ?? 'Usuario'}
                        </p>
                        <p className="truncate text-xs text-text-muted">{replyingTo.body}</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Cancelar respuesta"
                        className="shrink-0 rounded-md p-1 text-text-muted hover:bg-border-light hover:text-text-primary"
                        onClick={() => setReplyingTo(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : null}

                  {/* Composer */}
                  <form
                    onSubmit={submitMessage}
                    className="border-t border-border-light bg-white px-3 py-2.5"
                  >
                    <div className="flex items-end gap-2">
                      {/* Emoji picker */}
                      <div className="relative mb-1.5 shrink-0" ref={emojiRef}>
                        <button
                          type="button"
                          className={`text-text-muted transition hover:text-brand-primary ${emojiOpen ? 'text-brand-primary' : ''}`}
                          aria-label="Emoji"
                          onClick={() => setEmojiOpen((prev) => !prev)}
                        >
                          <Smile size={20} />
                        </button>
                        {emojiOpen ? (
                          <EmojiPicker
                            onPick={(emoji) => {
                              const textarea = textareaRef.current;
                              if (textarea) {
                                const start = textarea.selectionStart ?? message.length;
                                const end = textarea.selectionEnd ?? message.length;
                                const next = message.slice(0, start) + emoji + message.slice(end);
                                handleMessageChange(next);
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.setSelectionRange(start + emoji.length, start + emoji.length);
                                }, 0);
                              } else {
                                handleMessageChange(message + emoji);
                              }
                              setEmojiOpen(false);
                            }}
                          />
                        ) : null}
                      </div>

                      <textarea
                        ref={textareaRef}
                        rows={1}
                        className="flex-1 resize-none rounded-2xl border border-border-light bg-bg-soft px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                        style={{ minHeight: '40px', maxHeight: '136px' }}
                        maxLength={2000}
                        placeholder={canSend ? 'Escribe un mensaje...' : 'No tienes permiso para enviar mensajes'}
                        value={message}
                        disabled={!canSend}
                        onChange={(event) => handleMessageChange(event.target.value)}
                        onKeyDown={handleComposerKeyDown}
                      />

                      <button
                        type="submit"
                        disabled={!message.trim() || sendMessage.isPending || !canSend}
                        className="mb-1 shrink-0 rounded-full bg-brand-primary p-2 text-white disabled:opacity-40 hover:bg-brand-primary/90 transition"
                        aria-label="Enviar"
                      >
                        <Send size={16} />
                      </button>
                    </div>

                    {message.length > 1800 ? (
                      <p className="mt-1 text-right text-[11px] text-text-muted">{message.length}/2000</p>
                    ) : null}
                  </form>
                </>
              ) : (
                <div className="grid flex-1 place-items-center p-6">
                  <EmptyState title="Selecciona una conversación o inicia una nueva." />
                </div>
              )}
            </section>
          </SectionErrorBoundary>
        </div>
      </div>

      <NewConversationDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentUserId={currentUserId}
        onCreated={(conversation) => {
          setSelectedId(conversation.id);
          setModalOpen(false);
        }}
      />
      <DeviceKeysDialog open={devicesOpen} onClose={() => setDevicesOpen(false)} />
      {selectedConversation ? (
        <ManageGroupDialog
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          conversation={selectedConversation}
          currentUserId={currentUserId}
        />
      ) : null}
    </ProtectedLayout>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────

function ConversationRow({
  conversation,
  active,
  currentUserId,
  onClick,
  archived = false,
  onArchive,
  onUnarchive,
  onDelete,
  canDelete = false,
}: {
  conversation: ChatConversation;
  active: boolean;
  currentUserId?: string;
  onClick: () => void;
  archived?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const convTitle = conversationTitle(conversation, currentUserId);
  const colorCls = avatarColor(convTitle);
  const participant = conversation.participants.find((p) => p.userId === currentUserId);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div
      className={`group/row mb-0.5 flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition cursor-pointer ${
        active ? 'bg-brand-lighter' : 'hover:bg-bg-soft'
      }`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}
    >
      <div className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${colorCls}`}>
        {conversation.type === 'GROUP' ? <Users size={17} /> : initials(convTitle)}
        {archived ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white shadow-sm">
            <Archive size={9} className="text-text-muted" />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <p className={`truncate text-sm font-semibold ${active ? 'text-brand-primary' : 'text-text-primary'}`}>
            {convTitle}
          </p>
          <span className="shrink-0 text-[11px] text-text-muted">
            {formatRelativeTime(conversation.lastMessage?.createdAt ?? conversation.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {participant?.muted ? <BellOff size={11} className="shrink-0 text-text-muted" /> : null}
          <p className="truncate text-xs text-text-muted">
            {conversation.lastMessage?.body ?? participantLine(conversation, currentUserId)}
          </p>
        </div>
      </div>

      {/* Right side: unread badge or 3-dot menu on hover */}
      <div className="relative flex shrink-0 items-center" ref={menuRef}>
        {conversation.unreadCount > 0 && !menuOpen ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-primary px-1.5 text-[11px] font-bold text-white group-hover/row:hidden">
            {conversation.unreadCount}
          </span>
        ) : null}

        {/* 3-dot button — visible on hover or when menu open */}
        <button
          type="button"
          aria-label="Opciones"
          className={`rounded-md p-1 text-text-muted transition hover:bg-white hover:text-text-primary ${
            menuOpen ? 'flex' : 'hidden group-hover/row:flex'
          }`}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        >
          <MoreVertical size={14} />
        </button>

        {menuOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border-light bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {archived ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                onClick={() => { onUnarchive?.(); setMenuOpen(false); }}
              >
                <ArchiveX size={14} className="text-text-muted" />
                Restaurar
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-soft"
                onClick={() => { onArchive?.(); setMenuOpen(false); }}
              >
                <Archive size={14} className="text-text-muted" />
                Archivar
              </button>
            )}
            {canDelete ? (
              <>
                <div className="border-t border-border-light" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={() => { onDelete?.(); setMenuOpen(false); }}
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Search Result Row ───────────────────────────────────────────────────────

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded bg-amber-200 px-0.5 text-amber-900">{part}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function SearchResultRow({ message, highlight }: { message: ChatMessage; highlight: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border-light px-4 py-2.5 last:border-0 hover:bg-bg-soft">
      <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarColor(message.sender?.name)}`}>
        {initials(message.sender?.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-text-primary">{message.sender?.name ?? 'Usuario'}</span>
          <span className="text-[11px] text-text-muted">{formatTime(message.createdAt)}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
          {highlightText(message.body, highlight)}
        </p>
      </div>
    </div>
  );
}

// ─── Encryption Badge ────────────────────────────────────────────────────────

function EncryptionBadge({ status }: { status: 'e2e' | 'server' | 'none' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (status === 'none') return null;

  const isE2E = status === 'e2e';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={isE2E ? 'Cifrado extremo a extremo' : 'Cifrado en servidor'}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition hover:opacity-80 ${
          isE2E
            ? 'border-amber-200 bg-amber-50 text-[#15140F]'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}
      >
        {isE2E ? <ShieldCheck size={11} /> : <Lock size={11} />}
        <span className="hidden sm:inline">{isE2E ? 'E2E' : 'Cifrado'}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border-light bg-white p-4 shadow-xl">
          <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${isE2E ? 'text-[#15140F]' : 'text-amber-700'}`}>
            {isE2E ? <ShieldCheck size={16} /> : <Lock size={16} />}
            {isE2E ? 'Cifrado extremo a extremo' : 'Cifrado en servidor'}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {isE2E
              ? 'Los mensajes se cifran en tu dispositivo antes de enviarse. Solo tú y los participantes con dispositivos registrados pueden leerlos.'
              : 'Los mensajes están cifrados en el servidor, pero no en tu dispositivo. Registra una clave de dispositivo para activar el cifrado E2E.'}
          </p>
          {!isE2E ? (
            <p className="mt-2 text-[11px] text-text-muted">
              Ve a <strong>Más opciones → Mis dispositivos</strong> para registrar tu dispositivo.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Connection Badge ─────────────────────────────────────────────────────────

function ConnectionBadge({
  realtimeStatus,
  onReconnect,
}: {
  realtimeStatus: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  onReconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (realtimeStatus === 'connected' || realtimeStatus === 'idle') return null;

  const isReconnecting = realtimeStatus === 'connecting' || realtimeStatus === 'reconnecting';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={isReconnecting ? 'Reconectando...' : 'Sin conexión en tiempo real'}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition hover:opacity-80 ${
          isReconnecting
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-red-200 bg-red-50 text-red-600'
        }`}
      >
        {isReconnecting ? (
          <RefreshCw size={11} className="animate-spin" />
        ) : (
          <WifiOff size={11} />
        )}
        <span className="hidden sm:inline">{isReconnecting ? 'Reconectando' : 'Sin conexión'}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border-light bg-white p-4 shadow-xl">
          <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${isReconnecting ? 'text-amber-700' : 'text-red-600'}`}>
            {isReconnecting ? <RefreshCw size={16} className="animate-spin" /> : <WifiOff size={16} />}
            {isReconnecting ? 'Reconectando...' : 'Sin conexión en tiempo real'}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {isReconnecting
              ? 'Intentando restablecer la conexión con el servidor de chat.'
              : 'No hay conexión en tiempo real. Los mensajes pueden tardar en actualizarse.'}
          </p>
          {!isReconnecting ? (
            <button
              type="button"
              onClick={() => { onReconnect(); setOpen(false); }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary/90"
            >
              <RefreshCw size={12} />
              Reintentar conexión
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Mention Dropdown ────────────────────────────────────────────────────────

function MentionDropdown({
  query,
  participants,
  onSelect,
}: {
  query: string;
  participants: Array<{ userId: string; user: { name: string } }>;
  onSelect: (name: string) => void;
}) {
  const lower = query.toLowerCase();
  const filtered = participants.filter((p) =>
    p.user.name.toLowerCase().startsWith(lower),
  ).slice(0, 8);

  if (filtered.length === 0) return null;

  return (
    <div className="border-t border-border-light bg-white">
      <div className="max-h-44 overflow-y-auto py-1">
        {filtered.map((p) => (
          <button
            key={p.userId}
            type="button"
            className="flex w-full items-center gap-2 px-4 py-1.5 text-sm text-text-primary hover:bg-brand-lighter hover:text-brand-primary"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(p.user.name);
            }}
          >
            <span className="text-brand-primary font-medium">@</span>
            <span>{p.user.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Render message body with @mention highlights ────────────────────────────

function renderBodyWithMentions(body: string, currentUserId?: string, mentions?: Array<{ userId: string; name: string }>) {
  if (!mentions || mentions.length === 0) {
    return <>{body}</>;
  }

  const parts = body.split(/(@[\w\sáéíóúàèìòùñüÁÉÍÓÚÀÈÌÒÙÑÜ]+)/u);

  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith('@')) return <Fragment key={i}>{part}</Fragment>;
        const mentionName = part.slice(1).trim();
        const mentioned = mentions.find(
          (m) => m.name.toLowerCase() === mentionName.toLowerCase(),
        );
        if (!mentioned) return <Fragment key={i}>{part}</Fragment>;
        const isCurrentUser = mentioned.userId === currentUserId;
        return (
          <span
            key={i}
            className={`rounded px-0.5 font-semibold ${
              isCurrentUser
                ? 'bg-amber-100 text-amber-700'
                : 'bg-brand-lighter text-brand-primary'
            }`}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

// ─── Emoji Picker ────────────────────────────────────────────────────────────

const EMOJI_GROUPS: Array<{ label: string; emojis: string[] }> = [
  { label: 'Gestos', emojis: ['👍','👎','👏','🙌','🤝','🤜','✌️','👌','🤌','🤏','✋','🖐️','🤚','🖖','☝️','🤙','💪','🦾'] },
  { label: 'Caras', emojis: ['😀','😄','😁','😆','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😎','🤩','😏','😒','😔','😢','😭','😤','😠','😡','🤬','🤯','😳','🥺','😨','😱','🤔','🫡','😶','🤐','😴','😷','🤒'] },
  { label: 'Corazones', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️'] },
  { label: 'Naturaleza', emojis: ['🌱','🌿','🍃','🌲','🌳','🌴','🌵','🌾','🍀','🍁','🌸','🌺','🌻','🌹','🌷','🌼','💐','🍄','🌙','☀️','⭐','✨','🔥','💧','🌈','⚡','❄️','🌊'] },
  { label: 'Objetos', emojis: ['✅','❌','⚠️','💯','🔑','🔒','📋','📌','📎','🖊️','💡','🔔','🚨','📣','📢','💬','🗒️','📊','📈','📉','💰','💵','🎯','🏆','🎉','🎊','🎁','🕐','⏰','📱','💻'] },
];

const EmojiPicker: FC<{ onPick: (emoji: string) => void }> = ({ onPick }) => (
  <div className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-y-auto rounded-2xl border border-border-light bg-white p-3 shadow-lg" style={{ maxHeight: '280px' }}>
    {EMOJI_GROUPS.map((group) => (
      <div key={group.label} className="mb-2 last:mb-0">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{group.label}</p>
        <div className="flex flex-wrap gap-0.5">
          {group.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-bg-soft transition"
              onClick={() => onPick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ─── Modern Message Bubble ────────────────────────────────────────────────────

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

function ModernMessageBubble({
  message,
  mine,
  currentUserId,
  group,
  canDelete,
  onDelete,
  onReact,
  onReply,
  onEdit,
  onPin,
  isFirst,
  isLast,
}: {
  message: ChatMessage;
  mine: boolean;
  currentUserId?: string;
  group: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: (newBody: string) => void;
  onPin?: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="rounded-full bg-white border border-border-light px-3 py-0.5 text-[11px] text-text-muted shadow-sm">
          {message.body} · {formatTime(message.createdAt)}
        </span>
      </div>
    );
  }

  if (message.deleted) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-2' : 'mt-0.5'}`}>
        <p className={`text-xs italic text-text-muted px-3 py-1 ${mine ? 'text-right' : 'text-left'}`}>
          Mensaje eliminado
        </p>
      </div>
    );
  }

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  return (
    <div
      ref={bubbleRef}
      className={`flex ${mine ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-2' : 'mt-0.5'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      <div className={`relative max-w-[min(75%,36rem)] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name */}
        {group && !mine && isFirst ? (
          <p className="mb-1 ml-1 text-[11px] font-semibold text-brand-primary">
            {message.sender?.name ?? 'Usuario'}
          </p>
        ) : null}

        {/* Reaction picker — floats above the bubble, anchored inside relative container */}
        {pickerOpen ? (
          <div
            className={`absolute bottom-full z-20 mb-1 flex items-center gap-0.5 rounded-full border border-border-light bg-white px-1.5 py-1 shadow-lg ${
              mine ? 'right-0' : 'left-0'
            }`}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-bg-soft hover:scale-125"
                onClick={() => { onReact(emoji); setPickerOpen(false); }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div
          className={`relative px-3 py-2 text-sm shadow-sm ${
            mine
              ? 'bg-brand-primary text-white rounded-2xl rounded-br-md'
              : 'bg-white border border-border-light text-text-primary rounded-2xl rounded-bl-md'
          }`}
        >
          {/* Quoted message preview */}
          {message.replyTo ? (
            <div
              className={`mb-2 rounded-lg border-l-4 px-2.5 py-1.5 text-xs ${
                mine
                  ? 'border-white/50 bg-white/15 text-white/90'
                  : 'border-brand-primary bg-brand-lighter/60 text-text-secondary'
              }`}
            >
              <p className={`mb-0.5 font-semibold ${mine ? 'text-white' : 'text-brand-primary'}`}>
                {message.replyTo.senderName ?? 'Usuario'}
              </p>
              <p className="truncate">
                {message.replyTo.deleted ? <em>Mensaje eliminado</em> : message.replyTo.body}
              </p>
            </div>
          ) : null}

          {editing ? (
            <div className="space-y-1.5">
              <textarea
                className={`w-full resize-none rounded-lg border p-2 text-sm outline-none ${
                  mine
                    ? 'border-white/30 bg-white/10 text-white placeholder:text-white/50'
                    : 'border-border-light bg-white text-text-primary'
                }`}
                rows={2}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (editText.trim() && editText.trim() !== message.body) {
                      onEdit?.(editText.trim());
                    }
                    setEditing(false);
                  }
                  if (e.key === 'Escape') setEditing(false);
                }}
                autoFocus
              />
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  className={`font-medium ${mine ? 'text-white/80 hover:text-white' : 'text-brand-primary hover:text-brand-hover'}`}
                  onClick={() => {
                    if (editText.trim() && editText.trim() !== message.body) onEdit?.(editText.trim());
                    setEditing(false);
                  }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className={mine ? 'text-white/60 hover:text-white/80' : 'text-text-muted hover:text-text-secondary'}
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {renderBodyWithMentions(message.body, currentUserId, message.mentions)}
            </p>
          )}

          {/* Timestamp + edited + delete */}
          {isLast ? (
            <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${mine ? 'text-white/70' : 'text-text-muted'}`}>
              {message.pinnedAt ? <Pin size={9} className="text-amber-500" /> : null}
              {message.editedAt ? <span className="italic">editado</span> : null}
              <span>{formatTime(message.createdAt)}</span>
              {canDelete ? (
                <button type="button" onClick={onDelete} aria-label="Eliminar mensaje" className="hover:opacity-75">
                  <Trash2 size={11} />
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Action buttons on hover — reaction + reply + edit */}
          {(hovered || pickerOpen) && !editing ? (
            <div
              className={`absolute -bottom-3 z-10 flex items-center gap-0.5 ${
                mine ? '-left-24' : '-right-24'
              }`}
            >
              {onReply ? (
                <button
                  type="button"
                  aria-label="Responder"
                  onClick={onReply}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-border-light bg-white text-text-muted shadow-sm transition hover:scale-110 hover:text-brand-primary"
                >
                  <CornerUpLeft size={12} />
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  aria-label="Editar"
                  onClick={() => { setEditText(message.body); setEditing(true); }}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-border-light bg-white text-text-muted shadow-sm transition hover:scale-110 hover:text-brand-primary"
                >
                  <Pencil size={11} />
                </button>
              ) : null}
              {onPin ? (
                <button
                  type="button"
                  aria-label={message.pinnedAt ? 'Desfijar' : 'Fijar'}
                  onClick={onPin}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border border-border-light bg-white shadow-sm transition hover:scale-110 ${
                    message.pinnedAt ? 'text-amber-500 hover:text-amber-600' : 'text-text-muted hover:text-amber-500'
                  }`}
                >
                  {message.pinnedAt ? <PinOff size={11} /> : <Pin size={11} />}
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Reaccionar"
                onClick={() => setPickerOpen((v) => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border-light bg-white text-sm shadow-sm transition hover:scale-110"
              >
                😊
              </button>
            </div>
          ) : null}
        </div>

        {/* Reactions bar */}
        {hasReactions ? (
          <div className={`mt-1.5 flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {message.reactions!.map((r) => {
              const reacted = currentUserId ? r.userIds.includes(currentUserId) : false;
              return (
                <button
                  key={r.emoji}
                  type="button"
                  title={r.names.join(', ')}
                  onClick={() => onReact(r.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition hover:scale-105 ${
                    reacted
                      ? 'border-brand-primary bg-brand-lighter text-brand-primary font-semibold'
                      : 'border-border-light bg-white text-text-secondary hover:border-brand-primary hover:bg-brand-lighter'
                  }`}
                >
                  {r.emoji} <span>{r.count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── DeviceKeysDialog ────────────────────────────────────────────────────────

function DeviceKeysDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: devices = [], isLoading } = useChatDeviceKeys(open);
  const revokeDeviceKey = useRevokeChatDeviceKey();
  const currentDeviceId = getCurrentChatDeviceId();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function revoke(deviceId: string) {
    const current = deviceId === currentDeviceId;
    const confirmed = window.confirm(
      current
        ? '¿Revocar este dispositivo? Se generará una nueva clave local y la página se recargará.'
        : '¿Revocar este dispositivo? Dejará de estar autorizado para claves de chat.',
    );
    if (!confirmed) return;

    try {
      await revokeDeviceKey.mutateAsync(deviceId);
      if (current) {
        resetCurrentChatDeviceKey();
        toast.success('Dispositivo actual revocado. Generando nueva clave...');
        window.location.reload();
        return;
      }
      toast.success('Dispositivo revocado.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo revocar el dispositivo.'));
    }
  }

  function exportBackup() {
    const password = window.prompt(
      'Contraseña para cifrar la copia. Guárdala: no podremos recuperarla.',
    );
    if (!password) return;

    exportChatDeviceKeyBackup(password)
      .then((backup) => {
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cannaclub-chat-keys-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Copia de claves exportada.');
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'No se pudo exportar la copia.'));
      });
  }

  async function rotateKey() {
    const confirmed = window.confirm(
      '¿Rotar la clave de este dispositivo? Se conservará la clave anterior localmente para leer mensajes antiguos.',
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await rotateCurrentChatDeviceKey();
      toast.success('Clave rotada correctamente.');
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo rotar la clave.'));
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(file?: File) {
    if (!file) return;

    setBusy(true);
    try {
      const rawBackup = await file.text();
      const password = window.prompt('Contraseña de la copia de claves.');
      if (!password) return;
      const result = await importChatDeviceKeyBackup(rawBackup, password);
      toast.success(`Copia restaurada (${result.importedKeys} claves).`);
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo importar la copia.'));
    } finally {
      setBusy(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Dispositivos de chat</DialogTitle>
          <DialogDescription>
            Gestiona las claves públicas registradas para recibir chat privado en tus dispositivos.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border-light bg-bg-soft p-3">
          <p className="text-sm font-semibold text-text-primary">Recuperación de claves</p>
          <p className="mt-1 text-xs text-text-muted">
            Guarda esta copia en un lugar seguro. No podremos recuperar tus mensajes si pierdes tus claves o la contraseña.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={rotateKey} disabled={busy}>
              <RefreshCw size={14} className="mr-1" />
              Rotar clave
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportBackup}>
              <Download size={14} className="mr-1" />
              Exportar copia
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              disabled={busy}
            >
              <Upload size={14} className="mr-1" />
              Importar copia
            </Button>
            <input
              ref={importInputRef}
              className="hidden"
              type="file"
              accept="application/json,.json"
              onChange={(event) => importBackup(event.target.files?.[0])}
            />
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="rounded-lg border border-border-light bg-bg-soft p-3 text-sm text-text-muted">
              Cargando dispositivos...
            </p>
          ) : devices.length === 0 ? (
            <EmptyState title="No hay dispositivos registrados." />
          ) : (
            devices.map((device) => {
              const current = device.deviceId === currentDeviceId;
              const shortKey =
                device.publicKey.length > 22
                  ? `${device.publicKey.slice(0, 12)}...${device.publicKey.slice(-8)}`
                  : device.publicKey;

              return (
                <div
                  key={device.id}
                  className="flex items-start gap-3 rounded-lg border border-border-light bg-white p-3"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-lighter text-brand-primary">
                    <KeyRound size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-text-primary">
                        {current ? 'Este dispositivo' : device.deviceName ?? 'Dispositivo autorizado'}
                      </p>
                      {current ? (
                        <span className="rounded-full bg-brand-lighter px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                          Actual
                        </span>
                      ) : null}
                      <span className="rounded-full border border-border-light bg-bg-soft px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                        {device.algorithm}
                      </span>
                    </div>
                    {current && device.deviceName ? (
                      <p className="mt-1 text-xs text-text-secondary">{device.deviceName}</p>
                    ) : null}
                    <p className="mt-1 break-all font-mono text-xs text-text-muted">{shortKey}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Registrado: {formatTime(device.createdAt)}
                      {device.lastSeenAt ? ` · Último uso: ${formatTime(device.lastSeenAt)}` : ''}
                    </p>
                    {device.userAgent ? (
                      <p className="mt-1 truncate text-[11px] text-text-muted" title={device.userAgent}>
                        {device.userAgent}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revoke(device.deviceId)}
                    disabled={revokeDeviceKey.isPending}
                  >
                    Revocar
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── NewConversationDialog ────────────────────────────────────────────────────

function NewConversationDialog({
  open,
  onClose,
  currentUserId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  currentUserId?: string;
  onCreated: (conversation: ChatConversation) => void;
}) {
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const directMutation = useCreateDirectConversation();
  const groupMutation = useCreateGroupConversation();
  const collaboratorsQuery = useChatCollaborators(open);

  useEffect(() => {
    if (!open) return;

    setQuery('');
    setSelectedUserId('');
    setSelectedIds([]);
    setTitle('');
  }, [open]);

  const users = useMemo(
    () =>
      (collaboratorsQuery.data ?? []).filter(
        (option) =>
          option.userId !== currentUserId &&
          option.status === 'ACTIVE' &&
          option.role !== 'SUPERADMIN',
      ),
    [collaboratorsQuery.data, currentUserId],
  );

  const filteredUsers = users.filter((option) =>
    [option.name, option.email, option.role]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const conversation =
        mode === 'direct'
          ? await directMutation.mutateAsync({ userId: selectedUserId })
          : await groupMutation.mutateAsync({ title: title.trim(), participantIds: selectedIds });

      onCreated(conversation);
      setSelectedUserId('');
      setSelectedIds([]);
      setTitle('');
      toast.success(mode === 'direct' ? 'Conversación abierta.' : 'Grupo creado.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo crear la conversación.'));
    }
  }

  function toggleUser(userId: string) {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  const disabled =
    mode === 'direct'
      ? !selectedUserId || directMutation.isPending || collaboratorsQuery.isError
      : !title.trim() || selectedIds.length === 0 || groupMutation.isPending || collaboratorsQuery.isError;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva conversación</DialogTitle>
          <DialogDescription>Inicia un chat privado dentro del club.</DialogDescription>
        </DialogHeader>

        <form id="new-chat-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border-light bg-white p-1">
            {[
              ['direct', 'Directa'],
              ['group', 'Grupo'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`h-9 rounded-md text-sm font-semibold ${
                  mode === value ? 'bg-brand-primary text-white' : 'text-text-secondary'
                }`}
                onClick={() => setMode(value as 'direct' | 'group')}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'group' ? (
            <label className="grid gap-1.5 text-sm font-semibold text-text-primary">
              Nombre del grupo
              <input
                className="h-10 rounded-lg border border-border-light px-3 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Equipo mostrador"
              />
            </label>
          ) : null}

          <div className="relative">
            <Search className="absolute left-3 top-3 text-text-muted" size={15} />
            <input
              className="h-10 w-full rounded-lg border border-border-light pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar colaborador"
            />
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border-light bg-bg-soft p-2">
            {collaboratorsQuery.isLoading ? (
              <p className="p-2 text-sm text-text-muted">Cargando colaboradores...</p>
            ) : collaboratorsQuery.isError ? (
              <div className="space-y-2 p-2 text-sm">
                <p className="text-text-muted">
                  {collaboratorsQuery.error instanceof ApiError &&
                  collaboratorsQuery.error.status === 403
                    ? 'No tienes permiso para iniciar una conversación nueva.'
                    : 'No se pudieron cargar los colaboradores.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => collaboratorsQuery.refetch()}
                >
                  Reintentar
                </Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="p-2 text-sm text-text-muted">No hay colaboradores disponibles para iniciar conversación.</p>
            ) : (
              filteredUsers.map((option) => {
                const selected = mode === 'direct'
                  ? selectedUserId === option.userId
                  : selectedIds.includes(option.userId);

                return (
                  <button
                    key={option.userId}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left ${
                      selected ? 'border-brand-primary bg-white' : 'border-transparent hover:bg-white'
                    }`}
                    onClick={() => {
                      if (mode === 'direct') setSelectedUserId(option.userId);
                      else toggleUser(option.userId);
                    }}
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-lighter text-xs font-bold text-brand-primary">
                      {initials(option.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{option.name}</p>
                      <p className="truncate text-xs text-text-muted">{option.email} · {collaboratorRoleLabel(option.role)}</p>
                    </div>
                    {selected ? <Check size={16} className="text-brand-primary" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="new-chat-form" disabled={disabled}>
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ManageGroupDialog ────────────────────────────────────────────────────────

function ManageGroupDialog({
  open,
  onClose,
  conversation,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  conversation: ChatConversation;
  currentUserId?: string;
}) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const addParticipants = useAddChatParticipants(conversation.id);
  const removeParticipant = useRemoveChatParticipant(conversation.id);
  const updateParticipantRole = useUpdateChatParticipantRole(conversation.id);
  const participantIds = useMemo(
    () => new Set(conversation.participants.map((participant) => participant.userId)),
    [conversation.participants],
  );
  const collaboratorsQuery = useChatCollaborators(open);

  useEffect(() => {
    if (!open) return;

    setSelectedIds([]);
  }, [open, conversation.id]);

  const users = useMemo(
    () =>
      (collaboratorsQuery.data ?? []).filter(
        (option) =>
          option.status === 'ACTIVE' &&
          option.role !== 'SUPERADMIN' &&
          !participantIds.has(option.userId),
      ),
    [collaboratorsQuery.data, participantIds],
  );

  const filteredUsers = users.filter((option) =>
    [option.name, option.email, option.role]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  function toggleUser(userId: string) {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function addSelected() {
    try {
      await addParticipants.mutateAsync({ userIds: selectedIds });
      setSelectedIds([]);
      toast.success('Participantes añadidos.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron añadir participantes.'));
    }
  }

  async function remove(userId: string) {
    try {
      await removeParticipant.mutateAsync(userId);
      toast.success('Participante quitado.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo quitar el participante.'));
    }
  }

  async function updateRole(userId: string, role: 'OWNER' | 'MEMBER') {
    try {
      await updateParticipantRole.mutateAsync({ userId, role });
      toast.success('Rol actualizado.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el rol.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar grupo</DialogTitle>
          <DialogDescription>{conversation.title ?? 'Grupo interno'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h3 className="mb-2 text-sm font-bold text-text-primary">Participantes</h3>
            <div className="space-y-1 rounded-lg border border-border-light bg-bg-soft p-2">
              {conversation.participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3 rounded-lg bg-white p-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-lighter text-xs font-bold text-brand-primary">
                    {initials(participant.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{participant.user.name}</p>
                    <p className="truncate text-xs text-text-muted">
                      {participant.user.email} · {participant.role === 'OWNER' ? 'Propietario' : 'Miembro'}
                    </p>
                  </div>
                  <select
                    className="h-9 rounded-md border border-border-light bg-white px-2 text-xs font-semibold text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    value={participant.role}
                    onChange={(event) =>
                      updateRole(participant.userId, event.target.value as 'OWNER' | 'MEMBER')
                    }
                    disabled={updateParticipantRole.isPending}
                    aria-label="Rol del participante"
                  >
                    <option value="OWNER">Propietario</option>
                    <option value="MEMBER">Miembro</option>
                  </select>
                  {participant.userId !== currentUserId ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(participant.userId)}
                      disabled={removeParticipant.isPending || conversation.participants.length <= 2}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-bold text-text-primary">Añadir colaboradores</h3>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-3 text-text-muted" size={15} />
              <input
                className="h-10 w-full rounded-lg border border-border-light pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar colaborador"
              />
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border-light bg-bg-soft p-2">
              {collaboratorsQuery.isLoading ? (
                <p className="p-2 text-sm text-text-muted">Cargando colaboradores...</p>
              ) : collaboratorsQuery.isError ? (
                <div className="space-y-2 p-2 text-sm">
                  <p className="text-text-muted">
                    {collaboratorsQuery.error instanceof ApiError &&
                    collaboratorsQuery.error.status === 403
                      ? 'No tienes permiso para gestionar colaboradores en esta conversación.'
                      : 'No se pudieron cargar los colaboradores.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => collaboratorsQuery.refetch()}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="p-2 text-sm text-text-muted">No hay colaboradores disponibles.</p>
              ) : (
                filteredUsers.map((option) => {
                  const selected = selectedIds.includes(option.userId);
                  return (
                    <button
                      key={option.userId}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left ${
                        selected ? 'border-brand-primary bg-white' : 'border-transparent hover:bg-white'
                      }`}
                      onClick={() => toggleUser(option.userId)}
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-lighter text-xs font-bold text-brand-primary">
                        {initials(option.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{option.name}</p>
                        <p className="truncate text-xs text-text-muted">{option.email} · {collaboratorRoleLabel(option.role)}</p>
                      </div>
                      {selected ? <Check size={16} className="text-brand-primary" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={addSelected} disabled={!selectedIds.length || addParticipants.isPending}>
            Añadir seleccionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
