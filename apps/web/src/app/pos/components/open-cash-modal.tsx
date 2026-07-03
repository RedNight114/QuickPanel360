'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field } from '@/components/ui/field';

type OpenCashModalProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (openingCash: number) => Promise<void>;
};

export function OpenCashModal({
  open,
  loading,
  error,
  onClose,
  onConfirm,
}: OpenCashModalProps) {
  const [openingCash, setOpeningCash] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onConfirm(Number(openingCash));
      setOpeningCash('0');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abrir caja"
      description="Introduce el efectivo inicial disponible en caja."
      size="sm"
      actions={
        <div className="flex gap-3">
          <Button
            type="submit"
            form="open-cash-form"
            disabled={submitting || loading}
          >
            {submitting ? 'Abriendo...' : 'Abrir caja'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      }
    >
      <form id="open-cash-form" onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Efectivo inicial"
          type="number"
          min="0"
          step="0.01"
          value={openingCash}
          onChange={(event) => setOpeningCash(event.target.value)}
          error={error || undefined}
          required
          autoFocus
        />
      </form>
    </Modal>
  );
}
