'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useNotificationsUnreadCount,
  useReadAllNotifications,
  useReadNotification,
} from '@/hooks/useNotifications';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import type { InternalNotification } from '@/lib/types';

function priorityTone(priority: InternalNotification['priority']) {
  if (priority === 'CRITICAL') return 'text-red-700 bg-red-50 border-red-200';
  if (priority === 'IMPORTANT') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (priority === 'WARNING') return 'text-sky-700 bg-sky-50 border-sky-200';
  return 'text-yellow-800 bg-yellow-50 border-yellow-200';
}

function priorityLabel(priority: InternalNotification['priority']) {
  if (priority === 'CRITICAL') return 'Crítica';
  if (priority === 'IMPORTANT') return 'Importante';
  if (priority === 'WARNING') return 'Aviso';
  return 'Info';
}

function getNotificationPath(notification: InternalNotification) {
  const path = notification.metadata?.path;
  return typeof path === 'string' ? path : null;
}

export function NotificationsBell({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const unreadQuery = useNotificationsUnreadCount({ enabled });
  const latestQuery = useNotifications({ take: 5 }, { enabled });
  const readOne = useReadNotification();
  const readAll = useReadAllNotifications();
  const unreadCount = unreadQuery.data?.count ?? 0;

  async function markOneRead(id: string) {
    try {
      await readOne.mutateAsync(id);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo marcar el aviso como leído.'));
    }
  }

  async function markAllRead() {
    try {
      await readAll.mutateAsync();
      toast.success('Avisos marcados como leídos.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron actualizar los avisos.'));
    }
  }

  async function openContext(notification: InternalNotification) {
    const path = getNotificationPath(notification);
    if (!path) {
      return;
    }

    if (notification.status === 'UNREAD') {
      try {
        await readOne.mutateAsync(notification.id);
      } catch {
        // Dejamos continuar la navegación.
      }
    }

    router.push(path);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Centro de avisos">
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-primary px-1 text-[11px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-semibold text-text-primary">Centro de avisos</p>
            <p className="text-xs text-text-muted">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={readAll.isPending || unreadCount === 0}
          >
            <CheckCheck size={15} />
          </Button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto p-2">
          {latestQuery.isLoading ? (
            <p className="px-2 py-6 text-sm text-text-muted">Cargando avisos...</p>
          ) : latestQuery.isError ? (
            <p className="px-2 py-6 text-sm text-text-muted">No se pudieron cargar los avisos.</p>
          ) : latestQuery.data?.length ? (
            latestQuery.data.map((notification) => {
              const path = getNotificationPath(notification);

              return (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-3 ${notification.status === 'UNREAD' ? 'border-brand-primary/30 bg-brand-lighter/40' : 'border-border-light bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-text-primary">{notification.title}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${priorityTone(notification.priority)}`}
                        >
                          {priorityLabel(notification.priority)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{notification.message}</p>
                      <p className="mt-2 text-xs text-text-muted">{formatDate(notification.createdAt)}</p>
                    </div>
                    {notification.status === 'UNREAD' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => markOneRead(notification.id)}
                        disabled={readOne.isPending}
                      >
                        Leer
                      </Button>
                    ) : null}
                  </div>
                  {path ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openContext(notification)}
                      >
                        <ExternalLink size={14} />
                        Abrir contexto
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="px-2 py-6 text-sm text-text-muted">No hay avisos recientes.</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/notifications">Abrir Centro de avisos</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
