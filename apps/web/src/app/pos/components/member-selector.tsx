'use client';

import { Cake, Gift, HandCoins, Phone, Search, Star, X } from 'lucide-react';
import { HelpTip } from '@/components/help/help-tip';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  getBenefitForMember,
  getBirthdayInfo,
  getMemberClassLabel,
  getMemberDisplayName,
} from '@/lib/members';
import type { Member, MemberClassBenefit, Receivable } from '@/lib/types';

type MemberSelectorProps = {
  members: Member[];
  query: string;
  selectedMember: Member | null;
  loading: boolean;
  error: string | null;
  benefits?: MemberClassBenefit[];
  receivables?: Receivable[];
  receivablesLoading?: boolean;
  receivablesError?: string | null;
  selectedReceivablesTotal?: number;
  onQueryChange: (query: string) => void;
  onSelectMember: (member: Member) => void;
  onClearMember: () => void;
  onOpenReceivables?: () => void;
};

export function MemberSelector({
  members,
  query,
  selectedMember,
  loading,
  error,
  benefits = [],
  receivables = [],
  receivablesLoading = false,
  receivablesError,
  selectedReceivablesTotal = 0,
  onQueryChange,
  onSelectMember,
  onClearMember,
  onOpenReceivables,
}: MemberSelectorProps) {
  const visibleMembers = [...members]
    .sort((a, b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE'))
    .slice(0, 8);
  const birthday = getBirthdayInfo(selectedMember?.birthDate);
  const benefit = getBenefitForMember(selectedMember, benefits);
  const discountPct = Number(benefit?.discountPercent ?? 0);
  const birthdayEnabled = Boolean(benefit?.birthdayBenefitEnabled);
  const birthdayPct = Number(benefit?.birthdayDiscountPercent ?? 0);
  const hasBirthdayBonus = birthday?.isToday && birthdayEnabled;
  const hasClassBonus = discountPct > 0;

  function getBenefitLabel() {
    if (hasBirthdayBonus && birthdayPct > 0) {
      return `Bonificación de cumpleaños sugerida: ${birthdayPct}%`;
    }
    if (hasBirthdayBonus) {
      return benefit?.birthdayGiftNote || 'Beneficio de cumpleaños disponible';
    }
    if (hasClassBonus) {
      return `Bonificación sugerida: ${discountPct}%`;
    }
    return null;
  }

  const benefitLabel = getBenefitLabel();

  return (
    <Card className="h-fit overflow-visible border border-border-light bg-white shadow-card">
      <div className="p-2.5">

      {selectedMember ? (
        <div
          className={`mb-2.5 rounded-lg border p-2.5 ${
            selectedMember.status === 'ACTIVE'
              ? 'border-amber-200 bg-amber-50/70'
              : 'border-red-200 bg-red-50/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-text-primary">
                  {getMemberDisplayName(selectedMember)}
                </p>
                <Badge
                  variant={selectedMember.status === 'ACTIVE' ? 'success' : 'danger'}
                  size="sm"
                >
                  {selectedMember.status}
                </Badge>
              </div>
              <p className="text-xs text-text-muted">
                #{selectedMember.memberNumber ?? 'Sin número'} · <Star size={10} className="inline text-brand-primary" /> {getMemberClassLabel(selectedMember.memberClass)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearMember}
              className="shrink-0 rounded-md p-1 text-text-muted hover:bg-white hover:text-red-500"
              aria-label="Quitar socio"
            >
              <X size={16} />
            </button>
          </div>

          {/* Compact info badges */}
          <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
            {birthday?.isToday || birthday?.isSoon ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                <Cake size={10} />
                {birthday.isToday ? 'Cumple hoy' : `En ${birthday.days} días`}
              </span>
            ) : null}
            {benefitLabel ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-[#15140F]">
                <Gift size={10} />
                {benefitLabel}
              </span>
            ) : null}
            {selectedMember.phone ? (
              <span className="inline-flex items-center gap-1 text-text-muted">
                <Phone size={10} /> {selectedMember.phone}
              </span>
            ) : null}
          </div>

          {selectedMember.internalNotes ? (
            <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
              {selectedMember.internalNotes}
            </p>
          ) : null}
          {selectedMember.status !== 'ACTIVE' ? (
            <p className="mt-1.5 rounded-md bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700">
              Socio no activo — no se puede dispensar.
            </p>
          ) : null}

          <button
            type="button"
            className="mt-2 w-full rounded-md border border-border-light bg-white py-1.5 text-xs font-medium text-text-secondary hover:border-brand-primary/40 hover:text-brand-primary"
            onClick={() => { onClearMember(); onQueryChange(''); }}
          >
            Cambiar socio
          </button>

          {onOpenReceivables ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-white p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HandCoins size={15} className="text-amber-700" />
                  <p className="text-xs font-semibold text-amber-800">Cuentas pendientes</p>
                </div>
                <Badge variant={receivables.length ? 'warning' : 'success'} size="sm">
                  {receivables.length}
                </Badge>
              </div>

              {receivablesLoading ? (
                <p className="mt-2 text-xs text-text-muted">Consultando pendientes...</p>
              ) : null}
              {receivablesError ? (
                <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                  {receivablesError}
                </p>
              ) : null}
              {!receivablesLoading && !receivablesError && receivables.length === 0 ? (
                <p className="mt-2 text-xs text-[#15140F]">Sin importes pendientes.</p>
              ) : null}

              {receivables.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-text-muted">
                    Total pendiente:{' '}
                    <span className="font-semibold text-amber-800">
                      {formatCurrency(
                        receivables.reduce(
                          (sum, receivable) => sum + Number(receivable.outstandingAmount ?? 0),
                          0,
                        ),
                      )}
                    </span>
                    {selectedReceivablesTotal > 0 ? (
                      <>
                        {' '}· En registro de aportación:{' '}
                        <span className="font-semibold text-[#15140F]">
                          {formatCurrency(selectedReceivablesTotal)}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={onOpenReceivables}>
                    Gestionar
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mb-2.5 rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2">
          <p className="text-xs font-semibold text-text-primary">Selecciona un socio</p>
          <p className="text-[11px] text-blue-600">Busca por nombre, número o teléfono.</p>
        </div>
      )}

      <div className="relative mb-2 flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2 text-text-muted" size={14} />
          <input
            className="h-8 w-full rounded-lg border border-border-light bg-white pl-8 pr-3 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder="Buscar socio..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <HelpTip
          title="Seleccionar socio"
          text="Busca por nombre, número de socio o teléfono. Solo los socios activos pueden recibir dispensaciones."
          size={13}
          side="bottom"
          variant="info"
        />
      </div>

      {error ? (
        <div className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
          <p className="text-xs text-amber-700">{error}</p>
        </div>
      ) : null}

      <div className="max-h-64 space-y-1 overflow-y-auto">
        {loading && <p className="text-sm text-text-muted">Buscando socios...</p>}

        {!loading && visibleMembers.length === 0 && !selectedMember ? (
          <EmptyState
            title="No se encontraron socios"
            text={query ? 'Prueba con otro nombre, número o teléfono.' : 'Todavía no hay socios registrados.'}
          />
        ) : null}

        {!loading
          ? visibleMembers.map((member) => {
              const info = getBirthdayInfo(member.birthDate);
              return (
                <button
                  key={member.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg border border-border-light p-2 text-left transition hover:border-brand-primary/40 hover:bg-brand-lighter/30"
                  onClick={() => onSelectMember(member)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {getMemberDisplayName(member)}
                      </p>
                      <Badge variant={member.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                        {member.status}
                      </Badge>
                    </div>
                    <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                      <span>#{member.memberNumber ?? '—'}</span>
                      <span>·</span>
                      <span>{getMemberClassLabel(member.memberClass)}</span>
                      {info?.isToday ? (
                        <span className="text-amber-600">· 🎂 Hoy</span>
                      ) : info?.isSoon ? (
                        <span className="text-amber-600">· 🎂 {info.days}d</span>
                      ) : null}
                    </p>
                  </div>
                </button>
              );
            })
          : null}
      </div>
      </div>
    </Card>
  );
}
