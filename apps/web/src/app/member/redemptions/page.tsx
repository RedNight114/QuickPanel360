'use client';

import { useEffect, useState, useCallback } from 'react';
import { Receipt, Gift, Clock, CheckCircle2, XCircle, Truck, Ban } from 'lucide-react';
import { memberFetch } from '@/lib/member-api';

interface Redemption {
  id: string;
  rewardTitle: string;
  pointsSpent: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  notes: string | null;
}

interface RedemptionsResponse {
  redemptions: Redemption[];
}

const statusConfig: Record<
  Redemption['status'],
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  REQUESTED: {
    label: 'Solicitada',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
    icon: Clock,
  },
  APPROVED: {
    label: 'Aprobada',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rechazada',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: XCircle,
  },
  DELIVERED: {
    label: 'Entregada',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Truck,
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'text-gray-500',
    bg: 'bg-gray-100 border-gray-200',
    icon: Ban,
  },
};

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function MemberRedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRedemptions = useCallback(() => {
    setLoading(true);
    setError(null);
    memberFetch<RedemptionsResponse>('/member-app/redemptions')
      .then((res) => setRedemptions(res.redemptions))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar solicitudes'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#E0DDD4]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">{error}</p>
        <button
          onClick={fetchRedemptions}
          className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#15140F]">Mis canjes</h1>
        <p className="text-sm text-[#7A7770]">Historial de solicitudes de canje</p>
      </div>

      {/* Empty state */}
      {redemptions.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E0DDD4] bg-white py-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2EFE6]">
            <Receipt size={24} className="text-[#A8A5A0]" />
          </div>
          <p className="text-sm text-[#7A7770]">No tienes solicitudes de canje</p>
        </div>
      )}

      {/* Redemption cards */}
      {redemptions.map((redemption) => {
        const status = statusConfig[redemption.status];
        const StatusIcon = status.icon;

        return (
          <div
            key={redemption.id}
            className="rounded-2xl border border-[#E0DDD4] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Reward info */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2EFE6]">
                  <Gift size={18} className="text-[#15140F]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#15140F]">
                    {redemption.rewardTitle}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#7A7770]">
                    {formatDate(redemption.createdAt)}
                  </p>
                </div>
              </div>

              {/* Status badge */}
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.bg} ${status.color}`}
              >
                <StatusIcon size={10} />
                {status.label}
              </span>
            </div>

            {/* Points spent */}
            <div className="mt-3 flex items-center gap-1.5 border-t border-[#F2EFE6] pt-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50">
                <span className="text-[10px] font-bold text-red-500">-</span>
              </div>
              <span className="text-xs font-semibold text-[#15140F]">
                {redemption.pointsSpent.toLocaleString('es-ES')} puntos
              </span>
            </div>

            {/* Notes */}
            {redemption.notes && (
              <div className="mt-2 rounded-lg bg-[#F2EFE6] p-2.5">
                <p className="text-xs text-[#7A7770]">{redemption.notes}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
