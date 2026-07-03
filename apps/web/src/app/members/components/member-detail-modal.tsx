'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Cake, Camera, CheckCircle, ClipboardList, CreditCard, HandCoins, Loader2, Mail, MapPin, Phone, ShoppingBag, Star, StickyNote, Trash2, TrendingUp, UserRound, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { readStoredAuth } from '@/lib/auth';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMemberIncident, useCreateMemberNote, useDeleteMemberNote, useMemberIncidents, useResolveMemberIncident } from '@/hooks/useMembers';
import { formatCredits, formatDate } from '@/lib/format';
import { getBirthdayInfo, getMemberClassLabel, getMemberDisplayName } from '@/lib/members';
import type { Member, MemberIncident, MemberNote, MemberSummary } from '@/lib/types';
import { MemberStatusBadge } from './member-status-badge';

type DetailTab = 'profile' | 'dispensations' | 'receivables' | 'notes' | 'incidents';

const incidentTypeLabels: Record<string, string> = {
  WARNING: 'Aviso',
  PAYMENT_ISSUE: 'Problema de pago',
  BEHAVIOR: 'Comportamiento',
  DOCUMENT_ISSUE: 'Documentación',
  BAN: 'Expulsión',
  OTHER: 'Otro',
};

const incidentSeverityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baja', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { label: 'Media', color: 'bg-amber-100 text-amber-700' },
  HIGH: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: 'Crítica', color: 'bg-red-100 text-red-700' },
};

const incidentStatusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Abierta', color: 'bg-red-100 text-red-700' },
  UNDER_REVIEW: { label: 'En revisión', color: 'bg-amber-100 text-amber-700' },
  RESOLVED: { label: 'Resuelta', color: 'bg-amber-100 text-amber-700' },
  DISMISSED: { label: 'Descartada', color: 'bg-slate-100 text-slate-700' },
};

type MemberDetailModalProps = {
  open: boolean;
  member: Member | null;
  summary?: MemberSummary | null;
  fullView: boolean;
  canUpdate: boolean;
  canBlock: boolean;
  onClose: () => void;
  onOpen?: (member: Member) => void;
  onEdit: (member: Member) => void;
  onChangeStatus: (member: Member) => void;
};

const settlementLabels: Record<string, string> = {
  PAID: 'Completada',
  PARTIALLY_PAID: 'Parcial',
  PENDING: 'Pendiente',
};

const visibilityConfig: Record<string, { label: string; color: string }> = {
  ALL_STAFF: { label: 'Todo el equipo', color: 'bg-amber-100 text-amber-700' },
  MANAGER_AND_OWNER: { label: 'Managers', color: 'bg-amber-100 text-amber-700' },
  OWNER_ONLY: { label: 'Solo owner', color: 'bg-red-100 text-red-700' },
};

export function MemberDetailModal({
  open,
  member,
  summary,
  fullView,
  canUpdate,
  canBlock,
  onClose,
  onOpen,
  onEdit,
  onChangeStatus,
}: MemberDetailModalProps) {
  const [tab, setTab] = useState<DetailTab>('profile');
  const [newNote, setNewNote] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<string>('ALL_STAFF');
  const [incidentType, setIncidentType] = useState<string>('WARNING');
  const [incidentSeverity, setIncidentSeverity] = useState<string>('LOW');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const createNote = useCreateMemberNote();
  const deleteNote = useDeleteMemberNote();
  const incidentsQuery = useMemberIncidents(open ? member?.id : null);
  const createIncident = useCreateMemberIncident();
  const resolveIncident = useResolveMemberIncident();

  useEffect(() => {
    if (open && member && onOpen) {
      onOpen(member);
    }
  }, [open, member, onOpen]);

  if (!member) return null;

  const birthday = getBirthdayInfo(member.birthDate);
  const totalSpent = Number(summary?.totalSpent ?? 0);
  const salesCount = Number(summary?.salesCount ?? 0);
  const avgTicket = Number(summary?.averageTicket ?? 0);
  const pendingAmount = Number(summary?.pendingAmount ?? 0);
  // The API findOne includes MemberNote[] relations as `notes`, but the Member type defines notes as string.
  // Use a safe cast since the runtime value from findOne is actually an array of MemberNote.
  const memberNotes = (member as unknown as { notes?: MemberNote[] }).notes;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  async function handlePhotoUpload(file: File) {
    if (!member) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const stored = readStoredAuth();
      const res = await fetch(`${API_URL}/members/${member.id}/photo/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${stored?.accessToken}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Foto actualizada');
    } catch {
      toast.error('No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) { onClose(); setTab('profile'); setNewNote(''); setNoteVisibility('ALL_STAFF'); } }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <button
              type="button"
              className="relative group shrink-0"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !canUpdate}
            >
              <div
                className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-brand-lighter bg-cover bg-center text-sm font-bold text-brand-primary"
                style={member.photoUrl ? { backgroundImage: `url(${member.photoUrl})` } : undefined}
              >
                {member.photoUrl ? null : getMemberDisplayName(member).slice(0, 2).toUpperCase()}
              </div>
              {canUpdate && !uploading ? (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Camera size={16} className="text-white" />
                </div>
              ) : null}
              {uploading ? (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
                  <Loader2 size={16} className="animate-spin text-white" />
                </div>
              ) : null}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ''; }} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg">{getMemberDisplayName(member)}</span>
                <MemberStatusBadge status={member.status} />
              </div>
              <p className="text-sm font-normal text-text-muted">
                #{member.memberNumber ?? 'Sin número'} · <Star size={11} className="inline text-brand-primary" /> {getMemberClassLabel(member.memberClass)}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Detalle del socio</DialogDescription>
        </DialogHeader>

        {/* KPIs — always visible in full view */}
        {fullView ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard title="Total aportado" value={formatCredits(totalSpent)} icon={<TrendingUp size={16} />} tone="green" />
            <StatCard title="Dispensaciones" value={salesCount} icon={<ShoppingBag size={16} />} tone="blue" />
            <StatCard title="Media" value={formatCredits(avgTicket)} icon={<CreditCard size={16} />} tone="neutral" />
            <StatCard title="Pendiente" value={formatCredits(pendingAmount)} icon={<HandCoins size={16} />} tone={pendingAmount > 0 ? 'amber' : 'neutral'} />
          </div>
        ) : null}

        {/* Tabs */}
        {fullView ? (
          <div className="flex gap-1 rounded-lg bg-bg-soft p-1">
            {([
              ['profile', 'Perfil'],
              ['dispensations', `Dispensaciones (${summary?.recentSales?.length ?? 0})`],
              ['receivables', `Pendientes (${summary?.receivables?.length ?? 0})`],
              ['notes', `Notas (${(memberNotes)?.length ?? 0})`],
              ['incidents', `Incidencias (${incidentsQuery.data?.filter((i: MemberIncident) => i.status === 'OPEN' || i.status === 'UNDER_REVIEW').length ?? 0})`],
            ] as Array<[DetailTab, string]>).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === id ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
                onClick={() => setTab(id as DetailTab)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Tab content */}
        {tab === 'profile' || !fullView ? (
          <section className="space-y-3">
            <div className="grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
              {member.phone ? <span className="flex items-center gap-2"><Phone size={14} /> {member.phone}</span> : null}
              {member.email ? <span className="flex items-center gap-2"><Mail size={14} /> {member.email}</span> : null}
              {fullView && (member.address || member.city) ? <span className="flex items-center gap-2"><MapPin size={14} /> {[member.address, member.city, member.postalCode].filter(Boolean).join(', ')}</span> : null}
              {fullView && member.documentNumber ? <span className="flex items-center gap-2"><UserRound size={14} /> {member.documentType ?? 'Doc.'}: {member.documentNumber}</span> : null}
              {birthday ? (
                <span className="flex items-center gap-2">
                  <Cake size={14} />
                  {birthday.isToday ? <strong className="text-amber-600">Cumpleaños hoy</strong> : `Cumpleaños en ${birthday.days} días`}
                </span>
              ) : null}
            </div>
            {fullView && member.internalNotes ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="text-xs font-medium text-amber-600 mb-1">Notas internas</p>
                {member.internalNotes}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 text-xs text-text-muted">
              <span>Alta: {formatDate(member.createdAt)}</span>
              {summary?.lastSaleAt ? <span>Última dispensación: {formatDate(summary.lastSaleAt)}</span> : null}
            </div>
          </section>
        ) : null}

        {tab === 'dispensations' && fullView ? (
          <section className="space-y-2">
            {summary?.recentSales?.length ? (
              summary.recentSales.map((sale) => (
                <div key={sale.id} className="rounded-xl border border-border-light p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={14} className="text-text-muted" />
                      <span className="text-sm font-semibold text-text-primary">{formatCredits(sale.total)}</span>
                      <Badge
                        variant={sale.settlementStatus === 'PAID' ? 'success' : sale.settlementStatus === 'PENDING' ? 'warning' : 'secondary'}
                        size="sm"
                      >
                        {settlementLabels[sale.settlementStatus ?? ''] ?? sale.settlementStatus ?? 'Completada'}
                      </Badge>
                    </div>
                    <span className="text-xs text-text-muted">{formatDate(sale.createdAt)}</span>
                  </div>
                  {sale.items?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sale.items.map((item, i) => (
                        <span key={i} className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] text-text-secondary">
                          {item.productNameSnapshot} ×{Number(item.quantity).toFixed(Number(item.quantity) < 1 ? 3 : 0)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState title="Sin dispensaciones" text="Este socio no tiene dispensaciones registradas." />
            )}
          </section>
        ) : null}

        {tab === 'receivables' && fullView ? (
          <section className="space-y-2">
            {summary?.receivables?.length ? (
              summary.receivables.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-900">{r.reason ?? 'Pendiente de aportación'}</p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Estado: {r.status}
                      {r.dueDate ? ` · Vence: ${formatDate(r.dueDate)}` : ''}
                    </p>
                  </div>
                  <strong className="shrink-0 text-amber-900">{formatCredits(r.outstandingAmount)}</strong>
                </div>
              ))
            ) : (
              <EmptyState title="Sin pendientes" text="Este socio no tiene cuentas pendientes." />
            )}
          </section>
        ) : null}

        {tab === 'notes' && fullView ? (
          <section className="space-y-3">
            {/* New note form */}
            <div className="rounded-xl border border-border-light p-3 space-y-2">
              <Textarea
                placeholder="Escribe una nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Select value={noteVisibility} onValueChange={setNoteVisibility}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_STAFF">Todo el equipo</SelectItem>
                    <SelectItem value="MANAGER_AND_OWNER">Solo managers</SelectItem>
                    <SelectItem value="OWNER_ONLY">Solo owner</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!newNote.trim() || createNote.isPending}
                  onClick={() => {
                    createNote.mutate(
                      { memberId: member.id, note: newNote.trim(), visibility: noteVisibility },
                      { onSuccess: () => { setNewNote(''); onOpen?.(member); } },
                    );
                  }}
                >
                  {createNote.isPending ? 'Guardando...' : 'Agregar nota'}
                </Button>
              </div>
            </div>

            {/* Notes list */}
            {memberNotes?.length ? (
              memberNotes.map((n) => {
                const vis = visibilityConfig[n.visibility] ?? visibilityConfig.ALL_STAFF;
                return (
                  <div key={n.id} className="rounded-xl border border-border-light p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{n.note}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${vis.color}`}>
                            {vis.label}
                          </span>
                          <span className="text-xs text-text-muted">{formatDate(n.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-md p-1 text-text-muted hover:bg-red-50 hover:text-red-600 transition"
                        disabled={deleteNote.isPending}
                        onClick={() => deleteNote.mutate(
                          { memberId: member.id, noteId: n.id },
                          { onSuccess: () => onOpen?.(member) },
                        )}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={StickyNote} title="Sin notas" text="Este socio no tiene notas registradas." />
            )}
          </section>
        ) : null}

        {tab === 'incidents' && fullView ? (
          <section className="space-y-3">
            <div className="space-y-2 rounded-xl border border-border-light p-3">
              <p className="text-xs font-medium text-text-muted">Nueva incidencia</p>
              <div className="flex gap-2">
                <Select value={incidentType} onValueChange={setIncidentType}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(incidentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={incidentSeverity} onValueChange={setIncidentSeverity}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(incidentSeverityConfig).map(([value, cfg]) => (
                      <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Descripción de la incidencia..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                rows={2}
              />
              <Button
                size="sm"
                disabled={!incidentDescription.trim() || createIncident.isPending}
                onClick={async () => {
                  await createIncident.mutateAsync({
                    memberId: member.id,
                    type: incidentType,
                    severity: incidentSeverity,
                    description: incidentDescription.trim(),
                  });
                  setIncidentDescription('');
                }}
              >
                Registrar incidencia
              </Button>
            </div>

            {(incidentsQuery.data ?? []).length > 0 ? (
              (incidentsQuery.data ?? []).map((incident: MemberIncident) => {
                const severity = incidentSeverityConfig[incident.severity] ?? incidentSeverityConfig.LOW;
                const status = incidentStatusConfig[incident.status] ?? incidentStatusConfig.OPEN;
                const isOpen = incident.status === 'OPEN' || incident.status === 'UNDER_REVIEW';
                return (
                  <div key={incident.id} className="rounded-xl border border-border-light p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AlertTriangle size={14} className={severity.color.includes('red') ? 'text-red-500' : severity.color.includes('amber') ? 'text-amber-500' : 'text-slate-400'} />
                          <span className="text-sm font-semibold text-text-primary">{incidentTypeLabels[incident.type] ?? incident.type}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severity.color}`}>{severity.label}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>{status.label}</span>
                        </div>
                        <p className="mt-1 text-sm text-text-secondary">{incident.description}</p>
                        <p className="mt-1 text-[11px] text-text-muted">
                          {formatDate(incident.createdAt)}
                          {incident.resolvedAt ? ` · Resuelta: ${formatDate(incident.resolvedAt)}` : ''}
                        </p>
                      </div>
                      {isOpen ? (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolveIncident.isPending}
                            onClick={() => resolveIncident.mutate({ memberId: member.id, incidentId: incident.id, status: 'RESOLVED' })}
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={resolveIncident.isPending}
                            onClick={() => resolveIncident.mutate({ memberId: member.id, incidentId: incident.id, status: 'DISMISSED' })}
                          >
                            <XCircle size={14} />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={AlertTriangle} title="Sin incidencias" text="Este socio no tiene incidencias registradas." />
            )}
          </section>
        ) : null}

        <DialogFooter>
          {canBlock ? (
            <Button variant="ghost" onClick={() => onChangeStatus(member)}>Cambiar estado</Button>
          ) : null}
          {canUpdate ? (
            <Button variant="secondary" onClick={() => onEdit(member)}>Editar</Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
