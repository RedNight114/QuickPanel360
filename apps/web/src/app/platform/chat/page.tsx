'use client';

import { Fragment, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCheck,
  Headphones,
  Loader2,
  MessageSquare,
  PenSquare,
  Send,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatMessages, useMarkChatRead, useSendChatMessage } from '@/hooks/useChat';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import {
  useAssignSupportChat,
  useCreatePlatformConversation,
  usePlatformCollaborators,
  usePlatformConversations,
  useSupportChats,
} from '@/hooks/useSupportChat';
import { useAuth } from '@/providers/auth-provider';
import type { ChatMessage } from '@/lib/types';

type Tab = 'support' | 'internal';

function formatRelativeTime(value?: string | null) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function formatDaySeparator(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function initials(name?: string | null) {
  return (name ?? '?').slice(0, 2).toUpperCase();
}

const avatarColors = ['bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];

function avatarColor(name?: string | null) {
  const code = (name ?? '').charCodeAt(0) || 0;
  return avatarColors[code % avatarColors.length];
}

export default function PlatformChatPage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [tab, setTab] = useState<Tab>('support');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const supportChatsQuery = useSupportChats({ enabled: hasRole('SUPERADMIN') });
  const platformConversationsQuery = usePlatformConversations({ enabled: hasRole('SUPERADMIN') && tab === 'internal' });
  const collaboratorsQuery = usePlatformCollaborators({ enabled: hasRole('SUPERADMIN') && newChatOpen });
  const assignMutation = useAssignSupportChat();
  const createPlatformChat = useCreatePlatformConversation();

  const { status: wsStatus, typingUsers, emitTyping } = useChatRealtime(
    activeConversationId,
    hasRole('SUPERADMIN'),
  );

  if (!hasRole('SUPERADMIN')) {
    router.replace('/dashboard');
    return null;
  }

  const supportChats = supportChatsQuery.data ?? [];
  const platformConversations = platformConversationsQuery.data ?? [];
  const unassigned = supportChats.filter((c) => !c.assignedToId);
  const myChats = supportChats.filter((c) => c.assignedToId === user?.id);
  const otherChats = supportChats.filter((c) => c.assignedToId && c.assignedToId !== user?.id);

  if (activeConversationId) {
    const activeSupport = supportChats.find((c) => c.id === activeConversationId);
    const activePlatform = platformConversations.find((c) => c.id === activeConversationId);
    const title = activeSupport
      ? activeSupport.tenant?.name ?? 'Soporte'
      : getConversationTitle(activePlatform, user?.id);
    const subtitle = activeSupport?.assignedTo
      ? `Asignado a ${activeSupport.assignedTo.name}`
      : activeSupport
        ? 'Sin asignar'
        : null;

    return (
      <ProtectedLayout>
        <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
          <div className="flex items-center gap-3 border-b border-border-light px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveConversationId(null)}>
              <ArrowLeft size={16} />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text-primary truncate">{title}</h2>
                <WsIndicator status={wsStatus} />
              </div>
              {subtitle ? <p className="text-xs text-text-muted">{subtitle}</p> : null}
              {typingUsers.length > 0 ? (
                <p className="text-xs text-brand-primary animate-pulse">{typingUsers.join(', ')} escribiendo...</p>
              ) : null}
            </div>
          </div>
          <MessagePanel
            conversationId={activeConversationId}
            onTyping={(typing) => emitTyping(activeConversationId!, typing)}
          />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Chat de plataforma"
          description="Chat interno entre administradores y soporte a clubes."
        />

        <div className="flex gap-1 rounded-lg border border-border-light bg-bg-soft p-1">
          {(['support', 'internal'] as const).map((t) => (
            <button
              key={t}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === t ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
              onClick={() => setTab(t)}
            >
              {t === 'support' ? <Headphones size={14} className="mr-1.5 inline" /> : <MessageSquare size={14} className="mr-1.5 inline" />}
              {t === 'support' ? `Soporte (${supportChats.length})` : `Chat interno (${platformConversations.length})`}
            </button>
          ))}
        </div>

        {tab === 'support' ? (
          <div className="space-y-4">
            {supportChatsQuery.isLoading ? <LoadingSkeleton /> : supportChats.length === 0 ? (
              <EmptyState icon={Headphones} title="Sin chats de soporte" text="Los clubes aún no han contactado con soporte." />
            ) : (
              <>
                {unassigned.length > 0 ? (
                  <ChatSection title={`Sin asignar (${unassigned.length})`} color="text-amber-700">
                    {unassigned.map((chat) => (
                      <SupportChatCard key={chat.id} chat={chat}
                        onAssign={async () => { await assignMutation.mutateAsync(chat.id); setActiveConversationId(chat.id); }}
                        assigning={assignMutation.isPending}
                        onClick={() => setActiveConversationId(chat.id)} />
                    ))}
                  </ChatSection>
                ) : null}
                {myChats.length > 0 ? (
                  <ChatSection title={`Mis chats (${myChats.length})`} color="text-amber-700">
                    {myChats.map((chat) => <SupportChatCard key={chat.id} chat={chat} onClick={() => setActiveConversationId(chat.id)} />)}
                  </ChatSection>
                ) : null}
                {otherChats.length > 0 ? (
                  <ChatSection title={`Otros (${otherChats.length})`} color="text-text-muted">
                    {otherChats.map((chat) => <SupportChatCard key={chat.id} chat={chat} onClick={() => setActiveConversationId(chat.id)} />)}
                  </ChatSection>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setNewChatOpen(true)}>
                <PenSquare size={14} className="mr-1.5" />
                Nueva conversación
              </Button>
            </div>
            {platformConversationsQuery.isLoading ? <LoadingSkeleton /> : platformConversations.length === 0 ? (
              <EmptyState icon={MessageSquare} title="Sin conversaciones" text="Inicia una conversación con otro administrador." />
            ) : (
              <div className="space-y-2">
                {platformConversations.map((conv) => {
                  const otherUser = conv.participants?.find((p) => p.userId !== user?.id);
                  const lastMsg = conv.lastMessage;
                  const name = otherUser?.user?.name ?? 'Admin';
                  return (
                    <Card key={conv.id} className="flex items-center gap-4 p-4 cursor-pointer hover:border-brand-primary/40 transition" onClick={() => setActiveConversationId(conv.id)}>
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${avatarColor(name)}`}>
                        {initials(name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">{name}</p>
                        {lastMsg ? (
                          <p className="truncate text-xs text-text-muted">
                            {lastMsg.sender?.name ? `${lastMsg.sender.name}: ` : ''}{lastMsg.body?.slice(0, 60)}
                            <span className="ml-2 text-text-muted/60">{formatRelativeTime(lastMsg.createdAt)}</span>
                          </p>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
            <DialogDescription>Selecciona un administrador para chatear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {collaboratorsQuery.isLoading ? <Skeleton className="h-12" /> : (collaboratorsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No hay otros administradores disponibles.</p>
            ) : (
              (collaboratorsQuery.data ?? []).map((collab) => (
                <button key={collab.userId} type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-border-light p-3 text-left hover:border-brand-primary/40 hover:bg-bg-soft transition"
                  disabled={createPlatformChat.isPending}
                  onClick={async () => {
                    const conv = await createPlatformChat.mutateAsync(collab.userId);
                    setNewChatOpen(false);
                    if (conv?.id) setActiveConversationId(conv.id);
                  }}
                >
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarColor(collab.user.name)}`}>
                    {initials(collab.user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{collab.user.name}</p>
                    <p className="text-xs text-text-muted">{collab.user.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}

function WsIndicator({ status }: { status: string }) {
  if (status === 'connected') return <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />;
  if (status === 'connecting' || status === 'reconnecting') return <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />;
  return <WifiOff size={12} className="text-text-muted" />;
}

function getConversationTitle(
  conv: { participants?: Array<{ userId: string; user?: { name: string } }> } | undefined,
  myId?: string,
) {
  if (!conv?.participants) return 'Chat';
  const other = conv.participants.find((p) => p.userId !== myId);
  return other?.user?.name ?? 'Admin';
}

function ChatSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return <div className="space-y-2"><h3 className={`text-sm font-semibold ${color}`}>{title}</h3>{children}</div>;
}

function LoadingSkeleton() {
  return <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>;
}

function SupportChatCard({
  chat,
  onAssign,
  assigning,
  onClick,
}: {
  chat: Record<string, unknown> & {
    id: string;
    tenant?: { name: string };
    assignedTo?: { name: string } | null;
    messages?: Array<{ body?: string; createdAt?: string; sender?: { name: string } | null }>;
  };
  onAssign?: () => void;
  assigning?: boolean;
  onClick?: () => void;
}) {
  const lastMessage = chat.lastMessage as { sender?: { name?: string }; body?: string; createdAt?: string } | null | undefined;
  return (
    <Card className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:border-brand-primary/40 transition" onClick={onClick}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">{chat.tenant?.name ?? 'Club'}</span>
          {chat.assignedTo ? <Badge variant="secondary" size="sm">{chat.assignedTo.name}</Badge> : <Badge variant="warning" size="sm">Sin asignar</Badge>}
        </div>
        {lastMessage ? (
          <p className="mt-1 truncate text-xs text-text-muted">
            {lastMessage.sender?.name ? `${lastMessage.sender.name}: ` : ''}{lastMessage.body?.slice(0, 80)}
            <span className="ml-2 text-text-muted/60">{formatRelativeTime(lastMessage.createdAt)}</span>
          </p>
        ) : null}
      </div>
      {onAssign ? (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onAssign(); }} disabled={assigning}>
          <UserPlus size={14} className="mr-1" />Asignarme
        </Button>
      ) : null}
    </Card>
  );
}

function MessagePanel({ conversationId, onTyping }: { conversationId: string; onTyping?: (typing: boolean) => void }) {
  const { user } = useAuth();
  const messagesQuery = useChatMessages(conversationId);
  const sendMessage = useSendChatMessage(conversationId);
  const markRead = useMarkChatRead();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messages: ChatMessage[] = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current && messages.length > prevLengthRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  function handleInputChange(value: string) {
    setInput(value);
    onTyping?.(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping?.(false), 2000);
  }

  async function handleSend() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput('');
    onTyping?.(false);
    try {
      await sendMessage.mutateAsync({ body });
    } catch {
      toast.error('No se pudo enviar el mensaje.');
      setInput(body);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const reversed = useMemo(() => [...messages].reverse(), [messages]);

  let lastDay = '';

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messagesQuery.isLoading ? (
          <div className="space-y-3 py-8">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-1/2 ml-auto" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : reversed.length === 0 ? (
          <p className="text-center text-xs text-text-muted py-12">Sin mensajes aún. Escribe el primero.</p>
        ) : (
          reversed.map((msg, i) => {
            const isSystem = msg.type === 'SYSTEM';
            const isMine = msg.sender?.id === user?.id;
            const day = msg.createdAt?.slice(0, 10) ?? '';
            const showDay = day !== lastDay;
            if (showDay) lastDay = day;

            const prevMsg = i > 0 ? reversed[i - 1] : null;
            const isGrouped = !isSystem && prevMsg?.sender?.id === msg.sender?.id && prevMsg?.type !== 'SYSTEM' &&
              new Date(msg.createdAt).getTime() - new Date(prevMsg?.createdAt ?? 0).getTime() < 180000;

            return (
              <Fragment key={msg.id}>
                {showDay ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 border-t border-border-light" />
                    <span className="text-[10px] font-medium text-text-muted uppercase">{formatDaySeparator(msg.createdAt)}</span>
                    <div className="flex-1 border-t border-border-light" />
                  </div>
                ) : null}

                {isSystem ? (
                  <div className="text-center py-1">
                    <span className="inline-block rounded-full bg-bg-soft px-3 py-1 text-[11px] text-text-muted">{msg.body}</span>
                  </div>
                ) : (
                  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                    {!isMine && !isGrouped ? (
                      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold mr-2 mt-0.5 ${avatarColor(msg.sender?.name)}`}>
                        {initials(msg.sender?.name)}
                      </div>
                    ) : !isMine ? <div className="w-9 shrink-0" /> : null}

                    <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 ${
                      isMine ? 'bg-brand-primary text-white' : 'bg-bg-soft text-text-primary'
                    } ${isGrouped ? (isMine ? 'rounded-tr-lg' : 'rounded-tl-lg') : ''}`}>
                      {!isMine && !isGrouped ? (
                        <p className="text-[10px] font-semibold opacity-70 mb-0.5">{msg.sender?.name}</p>
                      ) : null}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] opacity-50">
                          {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine ? <CheckCheck size={10} className="opacity-50" /> : null}
                      </div>
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })
        )}
      </div>

      <div className="border-t border-border-light p-3">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary min-h-[40px] max-h-[120px]"
            placeholder="Escribe un mensaje..."
            rows={1}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            size="sm"
            className="h-10 w-10 shrink-0 rounded-xl p-0"
            disabled={!input.trim() || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </>
  );
}
