'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeButton?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  size = 'md',
  closeButton = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' };

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
      className="flex items-end justify-center p-2 pb-[env(safe-area-inset-bottom,0.5rem)] sm:items-center sm:p-4"
    >
      <div
        style={{ position: 'absolute', inset: 0 }}
        className="bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={clsx(
        'relative z-10 flex max-h-[calc(100dvh-0.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-border-light bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]',
        sizes[size],
      )}>
        <div className="flex items-start justify-between gap-4 border-b border-border-light px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
          </div>
          {closeButton ? (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-text-muted transition hover:bg-bg-soft hover:text-text-primary"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {actions ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border-light bg-bg-soft px-5 py-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
