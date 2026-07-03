'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Cake, Download, Plus, Star, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedLayout } from '@/components/layout/protected-layout';
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
import { ErrorState } from '@/components/ui/error-state';
import { CardGridSkeleton } from '@/components/ui/loading-state';
import { apiFetch } from '@/lib/api';
import { readStoredAuth } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';
import { QK } from '@/lib/query-keys';
import { getBirthdayInfo, getMemberClassLabel } from '@/lib/members';
import type { Member, MemberClassBenefit, MemberSummary } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useSettings } from '@/hooks/useSettings';
import { useMemberClasses } from '@/hooks/useMemberClasses';
import { MemberCard } from './components/member-card';
import { MemberDetailModal } from './components/member-detail-modal';
import {
  MemberFilters,
  type MemberSort,
  type MemberStatusFilter,
} from './components/member-filters';
import {
  emptyMemberForm,
  MemberFormModal,
  memberToForm,
  type MemberForm,
} from './components/member-form-modal';
import { MemberStatusModal } from './components/member-status-modal';

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportMembersCsv(members: Member[]) {
  const headers = [
    'Nº Socio',
    'Nombre',
    'Apellidos',
    'Email',
    'Teléfono',
    'Clase',
    'Estado',
    'Fecha alta',
  ];

  const classLabels: Record<string, string> = {
    STANDARD: 'Estándar',
    PREFERRED: 'Preferente',
    VIP: 'VIP',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    BLOCKED: 'Bloqueado',
    SUSPENDED: 'Suspendido',
  };

  const rows = members.map((member) => [
    member.memberNumber ?? '',
    member.firstName ?? '',
    member.lastName ?? '',
    member.email ?? '',
    member.phone ?? '',
    classLabels[member.memberClass ?? 'STANDARD'] ?? member.memberClass ?? 'Estándar',
    statusLabels[member.status ?? ''] ?? member.status ?? '',
    member.joinedAt
      ? new Date(member.joinedAt).toLocaleDateString('es-ES')
      : member.createdAt
        ? new Date(member.createdAt).toLocaleDateString('es-ES')
        : '',
  ]);

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map((value) => escapeCsv(String(value))).join(',')),
  ].join('\n');

  const blob = new Blob([`﻿${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `socios_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function toPayload(form: MemberForm, options: { omitMemberNumber?: boolean } = {}) {
  return Object.fromEntries(
    Object.entries(form).filter(([key, value]) => {
      if (options.omitMemberNumber && key === 'memberNumber') {
        return false;
      }

      if (typeof value === 'boolean') {
        return true;
      }

      return String(value).trim() !== '';
    }),
  );
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function MembersPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [summaries, setSummaries] = useState<Record<string, MemberSummary>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>('all');
  const [classFilter, setClassFilter] = useState<'all' | 'STANDARD' | 'PREFERRED' | 'VIP'>('all');
  const [birthdayOnly, setBirthdayOnly] = useState(false);
  const [sort, setSort] = useState<MemberSort>('recent');
  const [benefits, setBenefits] = useState<MemberClassBenefit[]>([]);
  const [birthdays, setBirthdays] = useState<Array<Member & { daysUntilBirthday: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formInitialValue, setFormInitialValue] = useState<MemberForm>(emptyMemberForm);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [statusMember, setStatusMember] = useState<Member | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);

  const canReadFull = hasPermission('members.read');
  const canReadBasic = hasPermission('members.read_basic');
  const canCreate = hasPermission('members.create');
  const canUpdate = hasPermission('members.update');
  const canBlock = hasPermission('members.block');
  const canViewBenefits = hasPermission('members.benefits.view');
  const canManageBenefits = hasPermission('members.benefits.manage');
  const settingsQuery = useSettings({ enabled: canCreate });
  const memberSettings = settingsQuery.data?.settings;
  const memberClassesQuery = useMemberClasses({ enabled: canCreate });

  const loadSummaries = useCallback(
    async (loadedMembers: Member[]) => {
      if (!canReadFull || loadedMembers.length === 0) {
        setSummaries({});
        return;
      }

      try {
        const ids = loadedMembers.slice(0, 50).map((m) => m.id);
        const batch = await apiFetch<Record<string, MemberSummary>>('/members/summaries', {
          method: 'POST',
          body: { ids },
        });
        setSummaries(batch);
      } catch {
        // summaries are best-effort, errors are silent
      }
    },
    [canReadFull],
  );

  const loadDetailSummary = useCallback(
    async (memberId: string) => {
      if (!canReadFull) return;
      try {
        const [full, detail] = await Promise.all([
          apiFetch<MemberSummary>(`/members/${memberId}/summary`),
          apiFetch<Member>(`/members/${memberId}`),
        ]);
        setSummaries((prev) => ({ ...prev, [memberId]: full }));
        setDetailMember(detail);
      } catch {
        // best-effort
      }
    },
    [canReadFull],
  );

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = canReadFull
        ? '/members'
        : canReadBasic
          ? '/members/search?q='
          : null;

      if (!endpoint) {
        setError('No tienes permiso para ver esta sección.');
        setMembers([]);
        return;
      }

      const loadedMembers = await apiFetch<Member[]>(endpoint);
      setMembers(loadedMembers);
      await loadSummaries(loadedMembers);

      if (canReadFull) {
        const upcoming = await apiFetch<Array<Member & { daysUntilBirthday: number }>>('/members/birthdays/upcoming?days=7');
        setBirthdays(upcoming);
      }

      if (canViewBenefits) {
        const loadedBenefits = await apiFetch<MemberClassBenefit[]>('/members/benefits/config');
        setBenefits(loadedBenefits);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los socios.'));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [canReadBasic, canReadFull, canViewBenefits, loadSummaries]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return members
      .filter((member) => {
        if (statusFilter !== 'all' && member.status !== statusFilter) {
          return false;
        }

        if (classFilter !== 'all' && (member.memberClass ?? 'STANDARD') !== classFilter) {
          return false;
        }

        if (birthdayOnly && !getBirthdayInfo(member.birthDate)?.isSoon && !getBirthdayInfo(member.birthDate)?.isToday) {
          return false;
        }

        if (!normalized) {
          return true;
        }

        const searchable = [
          member.memberNumber,
          member.firstName,
          member.lastName,
          member.email,
          member.phone,
          canReadFull ? member.documentNumber : undefined,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(normalized);
      })
      .sort((a, b) => {
        if (sort === 'name') {
          return `${a.firstName ?? ''} ${a.lastName ?? ''}`.localeCompare(
            `${b.firstName ?? ''} ${b.lastName ?? ''}`,
          );
        }

        if (sort === 'memberNumber') {
          return String(a.memberNumber ?? '').localeCompare(String(b.memberNumber ?? ''));
        }

        if (sort === 'spent') {
          return (
            toNumber(summaries[b.id]?.totalSpent) -
            toNumber(summaries[a.id]?.totalSpent)
          );
        }

        if (sort === 'lastSale') {
          return (
            new Date(summaries[b.id]?.lastSaleAt ?? 0).getTime() -
            new Date(summaries[a.id]?.lastSaleAt ?? 0).getTime()
          );
        }

        return (
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
        );
      });
  }, [birthdayOnly, canReadFull, classFilter, members, query, sort, statusFilter, summaries]);

  const memberKpis = useMemo(() => {
    const now = new Date();
    return {
      active: members.filter((member) => member.status === 'ACTIVE').length,
      newThisMonth: members.filter((member) => {
        const createdAt = member.createdAt ? new Date(member.createdAt) : null;
        return createdAt && createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
      }).length,
      birthdays: birthdays.length,
      pending: Object.values(summaries).filter((summary) => toNumber(summary.pendingAmount) > 0).length,
      preferred: members.filter((member) => ['PREFERRED', 'VIP'].includes(member.memberClass ?? '')).length,
    };
  }, [birthdays.length, members, summaries]);

  function openCreateModal() {
    setFormMode('create');
    setEditingMember(null);
    setFormInitialValue(emptyMemberForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditModal(member: Member) {
    setFormMode('edit');
    setEditingMember(member);
    setFormInitialValue(memberToForm(member));
    setFormError(null);
    setFormOpen(true);
  }

  async function saveMember(form: MemberForm) {
    setSaving(true);
    setFormError(null);

    try {
      if (formMode === 'edit' && editingMember) {
        await apiFetch<Member>(`/members/${editingMember.id}`, {
          method: 'PATCH',
          body: toPayload(form),
        });
        toast.success('Ficha actualizada.');
      } else {
        const created = await apiFetch<Member>('/members', {
          method: 'POST',
          body: toPayload(form, {
            omitMemberNumber: Boolean(memberSettings?.autoGenerateMemberNumber),
          }),
        });
        setDetailMember(created);
        toast.success('Socio creado correctamente.');
      }

      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: QK.members.all });
      await loadMembers();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar el socio.'));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(member: Member, status: string) {
    setSaving(true);

    try {
      const updated = await apiFetch<Member>(`/members/${member.id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      setStatusMember(null);
      setDetailMember((current) => (current?.id === member.id ? updated : current));
      toast.success('Estado actualizado.');
      queryClient.invalidateQueries({ queryKey: QK.members.all });
      await loadMembers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveBenefits() {
    setSaving(true);

    try {
      const updated = await apiFetch<MemberClassBenefit[]>('/members/benefits/config', {
        method: 'PATCH',
        body: {
          benefits: benefits.map((benefit) => ({
            memberClass: benefit.memberClass,
            discountPercent: Number(benefit.discountPercent ?? 0),
            birthdayBenefitEnabled: Boolean(benefit.birthdayBenefitEnabled),
            birthdayDiscountPercent: Number(benefit.birthdayDiscountPercent ?? 0),
            birthdayGiftNote: benefit.birthdayGiftNote ?? undefined,
            allowSpecialCreditLimit: Boolean(benefit.allowSpecialCreditLimit),
            creditLimitAmount: Number(benefit.creditLimitAmount ?? 0),
            notes: benefit.notes ?? undefined,
          })),
        },
      });
      setBenefits(updated);
      toast.success('Beneficios actualizados.');
      queryClient.invalidateQueries({ queryKey: QK.members.all });
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron guardar los beneficios.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleImportCsv() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const storedAuth = readStoredAuth();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/members/import`, {
        method: 'POST',
        headers: {
          ...(storedAuth?.accessToken
            ? { Authorization: `Bearer ${storedAuth.accessToken}` }
            : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.text();
        let message = `Error HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(body);
          message = parsed.message || message;
        } catch { /* ignore parse error */ }
        throw new Error(message);
      }

      const result = await response.json() as { created: number; errors: string[] };
      setImportResult(result);

      if (result.created > 0) {
        toast.success(`${result.created} socio(s) importado(s) correctamente.`);
        queryClient.invalidateQueries({ queryKey: QK.members.all });
        await loadMembers();
      }

      if (result.errors.length > 0 && result.created === 0) {
        toast.error('No se pudo importar ningún socio.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo importar el archivo CSV.'));
    } finally {
      setImporting(false);
    }
  }

  function updateBenefit(memberClass: MemberClassBenefit['memberClass'], key: keyof MemberClassBenefit, value: unknown) {
    setBenefits((current) =>
      current.map((benefit) =>
        benefit.memberClass === memberClass ? { ...benefit, [key]: value } : benefit,
      ),
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-primary">
              CRM del club
            </p>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">Socios</h1>
            <p className="mt-1 text-sm text-text-muted">Gestión de socios del club.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMembersCsv(filteredMembers)}
              disabled={filteredMembers.length === 0}
            >
              <Download size={15} />
              Exportar CSV
            </Button>
            {canCreate ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportFile(null);
                  setImportResult(null);
                  setImportOpen(true);
                }}
              >
                <Upload size={15} />
                Importar CSV
              </Button>
            ) : null}
            {canCreate ? (
              <Button onClick={openCreateModal}>
                <Plus size={16} />
                Nuevo socio
              </Button>
            ) : null}
          </div>
        </header>

        <MemberFilters
          query={query}
          status={statusFilter}
          sort={sort}
          canSortFinancial={canReadFull}
          onQueryChange={setQuery}
          onStatusChange={setStatusFilter}
          onSortChange={setSort}
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Activos', value: memberKpis.active, icon: Users },
            { label: 'Nuevos este mes', value: memberKpis.newThisMonth, icon: Plus },
            { label: 'Cumpleaños próximos', value: memberKpis.birthdays, icon: Cake },
            { label: 'Con pendiente', value: memberKpis.pending, icon: Star },
            { label: 'Preferentes/VIP', value: memberKpis.preferred, icon: Star },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-border-light bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Icon size={15} />
                  {item.label}
                </div>
                <p className="mt-1 text-xl font-bold text-text-primary">{item.value}</p>
              </div>
            );
          })}
        </section>

        <section className="flex flex-wrap gap-2">
          {(['all', 'STANDARD', 'PREFERRED', 'VIP'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                classFilter === value
                  ? 'border-brand-primary bg-brand-lighter text-brand-primary'
                  : 'border-border-light bg-white text-text-secondary hover:border-brand-primary/40'
              }`}
              onClick={() => setClassFilter(value)}
            >
              {value === 'all' ? 'Todas las clases' : getMemberClassLabel(value)}
            </button>
          ))}
          <button
            type="button"
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              birthdayOnly
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-border-light bg-white text-text-secondary hover:border-amber-200'
            }`}
            onClick={() => setBirthdayOnly((current) => !current)}
          >
            Cumpleaños próximos
          </button>
        </section>

        {canViewBenefits && benefits.length ? (
          <section className="rounded-xl border border-border-light bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Clases y beneficios</h2>
                <p className="text-xs text-text-muted">Sugerencias visibles en ficha y Punto de dispensación. No se aplican automáticamente.</p>
              </div>
              {canManageBenefits ? (
                <Button size="sm" variant="secondary" onClick={saveBenefits} disabled={saving}>
                  Guardar beneficios
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.memberClass} className="rounded-xl border border-border-light bg-white p-3 text-sm shadow-sm">
                <p className="font-semibold text-text-primary">{getMemberClassLabel(benefit.memberClass)}</p>
                <div className="mt-2 grid gap-2">
                  <label className="text-xs text-text-muted">
                    Bonificación sugerida (%)
                    <input className="mt-1 h-9 w-full rounded-lg border border-border-light px-2 text-sm text-text-primary" type="number" min="0" max="100" value={Number(benefit.discountPercent ?? 0)} disabled={!canManageBenefits} onChange={(event) => updateBenefit(benefit.memberClass, 'discountPercent', event.target.value)} />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <input type="checkbox" checked={Boolean(benefit.birthdayBenefitEnabled)} disabled={!canManageBenefits} onChange={(event) => updateBenefit(benefit.memberClass, 'birthdayBenefitEnabled', event.target.checked)} />
                    Beneficio cumpleaños
                  </label>
                  <label className="text-xs text-text-muted">
                    Bonificación cumpleaños (%)
                    <input className="mt-1 h-9 w-full rounded-lg border border-border-light px-2 text-sm text-text-primary" type="number" min="0" max="100" value={Number(benefit.birthdayDiscountPercent ?? 0)} disabled={!canManageBenefits} onChange={(event) => updateBenefit(benefit.memberClass, 'birthdayDiscountPercent', event.target.value)} />
                  </label>
                  <label className="text-xs text-text-muted">
                    Nota/regalo
                    <input className="mt-1 h-9 w-full rounded-lg border border-border-light px-2 text-sm text-text-primary" value={benefit.birthdayGiftNote ?? ''} disabled={!canManageBenefits} onChange={(event) => updateBenefit(benefit.memberClass, 'birthdayGiftNote', event.target.value)} />
                  </label>
                </div>
              </div>
            ))}
            </div>
          </section>
        ) : null}

        {error ? (
          <ErrorState
            message={error}
            onRetry={loadMembers}
          />
        ) : null}

        {loading ? <CardGridSkeleton count={6} /> : null}

        {!loading && !error && filteredMembers.length === 0 ? (
          <EmptyState
            title="No se encontraron socios"
            text="Prueba con otro nombre, número o teléfono."
          />
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              summary={summaries[member.id]}
              fullView={canReadFull}
              canUpdate={canUpdate}
              canBlock={canBlock}
              onView={setDetailMember}
              onEdit={openEditModal}
              onChangeStatus={setStatusMember}
            />
          ))}
        </section>
      </div>

      <MemberFormModal
        open={formOpen}
        mode={formMode}
        memberId={editingMember?.id}
        initialValue={formInitialValue}
        saving={saving}
        error={formError}
        autoGenerateMemberNumber={Boolean(memberSettings?.autoGenerateMemberNumber)}
        minimumMemberAge={memberSettings?.minimumMemberAge}
        memberNumberPrefix={memberSettings?.memberNumberPrefix}
        memberClassConfigs={memberClassesQuery.data}
        onClose={() => setFormOpen(false)}
        onSubmit={saveMember}
      />

      <MemberDetailModal
        open={Boolean(detailMember)}
        member={detailMember}
        summary={detailMember ? summaries[detailMember.id] : null}
        fullView={canReadFull}
        canUpdate={canUpdate}
        canBlock={canBlock}
        onClose={() => setDetailMember(null)}
        onOpen={(member) => loadDetailSummary(member.id)}
        onEdit={(member) => {
          setDetailMember(null);
          openEditModal(member);
        }}
        onChangeStatus={setStatusMember}
      />

      <MemberStatusModal
        open={Boolean(statusMember)}
        member={statusMember}
        saving={saving}
        onClose={() => setStatusMember(null)}
        onConfirm={changeStatus}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar socios desde CSV</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV con columnas como: memberNumber, firstName, lastName, email, phone, birthDate, address, city, postalCode, notes, class.
              Tambi&eacute;n acepta nombres en espa&ntilde;ol: nombre, apellidos, telefono, etc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-brand-lighter file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-primary hover:file:bg-brand-light"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportResult(null);
              }}
            />

            {importResult ? (
              <div className="rounded-lg border border-border-light bg-surface-secondary p-3 text-sm">
                <p className="font-medium text-text-primary">
                  {importResult.created} socio(s) creado(s)
                </p>
                {importResult.errors.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-status-error">
                      {importResult.errors.length} error(es):
                    </p>
                    <ul className="mt-1 max-h-32 list-inside list-disc overflow-y-auto text-xs text-text-muted">
                      {importResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              disabled={!importFile || importing}
              onClick={handleImportCsv}
            >
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
