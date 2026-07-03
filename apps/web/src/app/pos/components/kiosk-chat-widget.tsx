'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Send, X } from 'lucide-react';
import { useChatConversations, useChatMessages, useMarkChatRead, useSendChatMessage } from '@/hooks/useChat';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useAuth } from '@/providers/auth-provider';
import { formatDate } from '@/lib/format';
import type { ChatConversation, ChatMessage } from '@/lib/types';

function getConversationName(conv: ChatConversation, userId?: string) {
  if (conv.title) return conv.title;
  const other = conv.participants?.find(p => p.userId !== userId);
  return other?.user?.name ?? 'Chat';
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function decryptBody(msg: ChatMessage) {
  return msg.body ?? '';
}

export function KioskChatWidget({ onClose }: { onClose: () => void }) {
  const { user, hasPermission } = useAuth();
  const canChat = hasPermission('chat.view');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const conversationsQuery = useChatConversations(canChat);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);

  const { status: wsStatus } = useChatRealtime(activeConvId, canChat);

  if (!canChat) {
    return (
      <div className="flex h-full flex-col">
        <WidgetHeader title="Chat" onClose={onClose} />
        <div className="flex-1 grid place-items-center p-4">
          <p className="text-xs text-text-muted text-center">No tienes permisos de chat.</p>
        </div>
      </div>
    );
  }

  if (activeConvId) {
    return (
      <ChatThread
        conversationId={activeConvId}
        conversations={conversations}
        userId={user?.id}
        onBack={() => setActiveConvId(null)}
        onClose={onClose}
        wsStatus={wsStatus}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <WidgetHeader title="Chat interno" onClose={onClose} badge={wsStatus === 'connected' ? 'online' : undefined} />
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="grid h-full place-items-center p-4">
            <p className="text-xs text-text-muted text-center">Sin conversaciones activas</p>
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {conversations.map((conv) => {
              const name = getConversationName(conv, user?.id);
              const lastMsg = conv.lastMessage;
              const unread = conv.unreadCount > 0;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConvId(conv.id)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#F2EFE6] ${unread ? 'bg-[#FFE600]/5' : ''}`}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-lighter text-[10px] font-bold text-brand-primary">
                    {getInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${unread ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>{name}</p>
                      {conv.unreadCount > 0 ? (
                        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#15140F] px-1 text-[9px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    {lastMsg ? (
                      <p className="mt-0.5 truncate text-[10px] text-text-muted">
                        {decryptBody(lastMsg).slice(0, 60)}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetHeader({ title, onClose, onBack, badge }: { title: string; onClose: () => void; onBack?: () => void; badge?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border-light px-3 py-2">
      {onBack ? (
        <button type="button" onClick={onBack} className="text-text-muted hover:text-text-primary">
          <ArrowLeft size={14} />
        </button>
      ) : null}
      <p className="flex-1 text-xs font-semibold text-text-primary">{title}</p>
      {badge ? (
        <span className="flex items-center gap-1 text-[9px] text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {badge}
        </span>
      ) : null}
      <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
        <X size={14} />
      </button>
    </div>
  );
}

function ChatThread({
  conversationId,
  conversations,
  userId,
  onBack,
  onClose,
  wsStatus,
}: {
  conversationId: string;
  conversations: ChatConversation[];
  userId?: string;
  onBack: () => void;
  onClose: () => void;
  wsStatus: string;
}) {
  const messagesQuery = useChatMessages(conversationId);
  const sendMessage = useSendChatMessage(conversationId);
  const markRead = useMarkChatRead();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const raw = messagesQuery.data ?? [];
    return [...raw].reverse();
  }, [messagesQuery.data]);

  const conv = conversations.find(c => c.id === conversationId);
  const title = conv ? getConversationName(conv, userId) : 'Chat';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    markRead.mutate(conversationId);
  }, [conversationId, messages.length]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || !conversationId) return;
    sendMessage.mutate({ body });
    setInput('');
  }

  return (
    <div className="flex h-full flex-col">
      <WidgetHeader title={title} onClose={onClose} onBack={onBack} badge={wsStatus === 'connected' ? 'online' : undefined} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.map((msg) => {
          const isMine = msg.senderId === userId;
          const isSystem = msg.type === 'SYSTEM';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="inline-block rounded-full bg-[#F2EFE6] px-2.5 py-0.5 text-[9px] text-text-muted">
                  {decryptBody(msg)}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed ${
                isMine
                  ? 'bg-[#15140F] text-white rounded-br-sm'
                  : 'bg-white border border-border-light text-text-primary rounded-bl-sm'
              }`}>
                {!isMine && msg.sender ? (
                  <p className="mb-0.5 text-[9px] font-semibold text-brand-primary">{msg.sender.name}</p>
                ) : null}
                <p className="whitespace-pre-wrap break-words">{decryptBody(msg)}</p>
                <p className={`mt-0.5 text-[8px] text-right ${isMine ? 'text-white/40' : 'text-text-muted/60'}`}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-1.5 border-t border-border-light px-2 py-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-lg border border-border-light bg-[#F2EFE6] px-2.5 py-1.5 text-[11px] text-text-primary outline-none placeholder:text-text-muted focus:border-[#15140F] focus:bg-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || sendMessage.isPending}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#15140F] text-white transition disabled:opacity-30"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
