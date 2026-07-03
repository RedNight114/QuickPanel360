'use client';

import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateThirdParty, useThirdParties } from '@/hooks/useThirdParties';
import { useCreateThirdPartyPayment } from '@/hooks/useThirdPartyPayments';
import type {
  ThirdPartyPaymentCategory,
  ThirdPartyType,
} from '@/lib/types';

const categoryOptions: Array<{ value: ThirdPartyPaymentCategory; label: string }> = [
  { value: 'SUPPLIER_PAYMENT', label: 'Aportación a tercero' },
  { value: 'SERVICE_PAYMENT', label: 'Aportación de servicio' },
  { value: 'COLLABORATOR_PAYMENT', label: 'Aportación a colaborador' },
  { value: 'CASH_WITHDRAWAL', label: 'Retirada' },
  { value: 'EXPENSE', label: 'Salida' },
  { value: 'OTHER', label: 'Otro' },
];

const thirdPartyTypeOptions: Array<{ value: ThirdPartyType; label: string }> = [
  { value: 'SUPPLIER', label: 'Tercero' },
  { value: 'SERVICE_PROVIDER', label: 'Servicio' },
  { value: 'COLLABORATOR', label: 'Colaborador' },
  { value: 'OTHER', label: 'Otro' },
];

type ThirdPartyPaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreateThirdParty: boolean;
  onSuccess?: () => void;
};

export function ThirdPartyPaymentModal({
  open,
  onOpenChange,
  canCreateThirdParty,
  onSuccess,
}: ThirdPartyPaymentModalProps) {
  const { data: thirdParties = [] } = useThirdParties({ status: 'ACTIVE', take: 200 });
  const createPayment = useCreateThirdPartyPayment();
  const createThirdParty = useCreateThirdParty();
  const [thirdPartyId, setThirdPartyId] = useState<string>('none');
  const [category, setCategory] = useState<ThirdPartyPaymentCategory>('SUPPLIER_PAYMENT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickType, setQuickType] = useState<ThirdPartyType>('SUPPLIER');
  const [error, setError] = useState<string | null>(null);

  const selectedThirdParty = useMemo(
    () => thirdParties.find((thirdParty) => thirdParty.id === thirdPartyId),
    [thirdParties, thirdPartyId],
  );

  function reset() {
    setThirdPartyId('none');
    setCategory('SUPPLIER_PAYMENT');
    setAmount('');
    setReason('');
    setNotes('');
    setQuickCreateOpen(false);
    setQuickName('');
    setQuickType('SUPPLIER');
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Introduce unos creditos mayores que 0.');
      return;
    }

    if (!reason.trim()) {
      setError('Indica un motivo para registrar la aportación.');
      return;
    }

    try {
      await createPayment.mutateAsync({
        thirdPartyId: thirdPartyId === 'none' ? undefined : thirdPartyId,
        amount: numericAmount,
        category,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success('Aportación a tercero registrada');
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : 'No se pudo registrar la aportación a tercero.',
      );
    }
  }

  async function createQuickThirdParty() {
    setError(null);

    if (!quickName.trim()) {
      setError('Indica el nombre del tercero.');
      return;
    }

    try {
      const created = await createThirdParty.mutateAsync({
        name: quickName.trim(),
        type: quickType,
      });
      setThirdPartyId(created.id);
      setQuickCreateOpen(false);
      setQuickName('');
      toast.success('Tercero creado');
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'No se pudo crear el tercero.',
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Registrar aportación a tercero</DialogTitle>
            <DialogDescription>
              Estos créditos saldrán de la caja abierta y quedarán registrados en auditoría.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Tercero
              <div className="flex gap-2">
                <Select value={thirdPartyId} onValueChange={setThirdPartyId}>
                  <SelectTrigger className="min-w-0 flex-1 bg-white">
                    <SelectValue placeholder="Seleccionar tercero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin tercero asociado</SelectItem>
                    {thirdParties.map((thirdParty) => (
                      <SelectItem key={thirdParty.id} value={thirdParty.id}>
                        {thirdParty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canCreateThirdParty ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQuickCreateOpen((value) => !value)}
                  >
                    Nuevo
                  </Button>
                ) : null}
              </div>
              {selectedThirdParty ? (
                <span className="text-xs text-text-secondary">
                  {selectedThirdParty.documentNumber || selectedThirdParty.email || selectedThirdParty.type}
                </span>
              ) : null}
            </label>

            {quickCreateOpen ? (
              <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 md:col-span-2 md:grid-cols-[1fr_180px_auto] md:items-end">
                <label className="grid gap-1 text-sm font-medium">
                  Nombre del tercero
                  <Input
                    value={quickName}
                    onChange={(event) => setQuickName(event.target.value)}
                    placeholder="Tercero o colaborador"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Tipo
                  <Select value={quickType} onValueChange={(value) => setQuickType(value as ThirdPartyType)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {thirdPartyTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button
                  type="button"
                  onClick={createQuickThirdParty}
                  disabled={createThirdParty.isPending}
                >
                  Crear
                </Button>
              </div>
            ) : null}

            <label className="grid gap-1 text-sm font-medium">
              Categoria
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as ThirdPartyPaymentCategory)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Créditos
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Motivo de la aportación
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej. Aportación a tercero"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Notas opcionales
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Detalle interno de la aportación"
              />
            </label>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Guardando...' : 'Registrar aportación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
