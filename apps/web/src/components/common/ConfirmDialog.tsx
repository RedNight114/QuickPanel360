'use client';

import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Controla el diálogo externamente (opcional) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // el caller ya muestra el error via toast; no cerramos el diálogo
    } finally {
      setPending(false);
    }
  }

  const content = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'default'}
          disabled={pending}
          onClick={handleConfirm}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          {pending ? 'Procesando...' : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
      {content}
    </Dialog>
  );
}
