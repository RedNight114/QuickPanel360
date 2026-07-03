'use client';

import { Cake, CalendarDays, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/format';
import { getBirthdayInfo, getMemberClassLabel, getMemberDisplayName } from '@/lib/members';
import type { Member, MemberSummary } from '@/lib/types';
import { MemberStatusBadge } from './member-status-badge';

type MemberCardProps = {
  member: Member;
  summary?: MemberSummary | null;
  fullView: boolean;
  canUpdate: boolean;
  canBlock: boolean;
  onView: (member: Member) => void;
  onEdit: (member: Member) => void;
  onChangeStatus: (member: Member) => void;
};

function initials(member: Member) {
  const name = getMemberDisplayName(member);
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'S';
}

export function MemberCard({
  member,
  summary,
  fullView,
  canUpdate,
  canBlock,
  onView,
  onEdit,
  onChangeStatus,
}: MemberCardProps) {
  const birthday = getBirthdayInfo(member.birthDate);

  return (
    <Card className="overflow-hidden border border-border-light bg-white p-4 shadow-sm transition hover:border-brand-primary/40 hover:shadow-card">
      <div className="flex items-start gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-lighter bg-cover bg-center text-sm font-bold text-brand-primary"
          style={member.photoUrl ? { backgroundImage: `url(${member.photoUrl})` } : undefined}
        >
          {member.photoUrl ? null : initials(member)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary">
                {getMemberDisplayName(member)}
              </p>
              <p className="text-xs text-text-muted">
                Nº socio {member.memberNumber ?? 'sin número'}
              </p>
            </div>
            <MemberStatusBadge status={member.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-brand-primary/20 bg-brand-lighter px-2 py-0.5 text-[11px] font-medium text-brand-primary">
              {getMemberClassLabel(member.memberClass)}
            </span>
            {birthday?.isToday || birthday?.isSoon ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                <Cake size={12} />
                {birthday.isToday ? 'Cumple hoy' : `Cumple en ${birthday.days} días`}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-1 text-xs text-text-secondary">
            {member.phone ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <Phone size={13} /> <span className="truncate">{member.phone}</span>
              </span>
            ) : member.email ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <Mail size={13} /> <span className="truncate">{member.email}</span>
              </span>
            ) : (
              <span className="text-text-muted">Sin contacto registrado</span>
            )}
            {member.createdAt ? (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} /> Alta: {formatDate(member.createdAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {fullView ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border-light bg-bg-soft p-2">
            <p className="text-text-muted">Total aportado</p>
            <p className="font-semibold text-text-primary">
              {formatCurrency(summary?.totalSpent ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-2">
            <p className="text-text-muted">Dispensaciones</p>
            <p className="font-semibold text-text-primary">{summary?.salesCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-2">
            <p className="text-text-muted">Media por dispensación</p>
            <p className="font-semibold text-text-primary">
              {formatCurrency(summary?.averageTicket ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-2">
            <p className="text-text-muted">Pendiente de aportación</p>
            <p className="font-semibold text-amber-700">
              {formatCurrency(summary?.pendingAmount ?? 0)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onView(member)}>
          {fullView ? 'Ver detalle' : 'Ver básico'}
        </Button>
        {canUpdate ? (
          <Button size="sm" variant="secondary" onClick={() => onEdit(member)}>
            Editar
          </Button>
        ) : null}
        {canBlock ? (
          <Button size="sm" variant="ghost" onClick={() => onChangeStatus(member)}>
            Estado
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

