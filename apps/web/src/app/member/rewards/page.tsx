'use client';

import { useEffect, useState, useCallback } from 'react';
import { Gift, Star, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { memberFetch } from '@/lib/member-api';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  pointsCost: number;
  imageUrl: string | null;
  terms: string | null;
  currentStock: number | null;
  stockLimit: number | null;
}

interface RewardsResponse {
  rewards: Reward[];
  memberPoints: number;
}

interface RedeemResult {
  success: boolean;
  message?: string;
  redemptionId?: string;
}

export default function MemberRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [memberPoints, setMemberPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchRewards = useCallback(() => {
    setLoading(true);
    setError(null);
    memberFetch<RewardsResponse>('/member-app/rewards')
      .then((res) => {
        setRewards(res.rewards);
        setMemberPoints(res.memberPoints);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar recompensas'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleRedeem = async (reward: Reward) => {
    setRedeemingId(reward.id);
    try {
      const result = await memberFetch<RedeemResult>(
        `/member-app/rewards/${reward.id}/redeem`,
        { method: 'POST' },
      );
      if (result.success) {
        showToast(result.message || 'Solicitud de canje enviada', 'success');
        fetchRewards();
      } else {
        showToast(result.message || 'No se pudo procesar el canje', 'error');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Error al solicitar canje',
        'error',
      );
    } finally {
      setRedeemingId(null);
    }
  };

  const toggleTerms = (id: string) => {
    setExpandedTerms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#E0DDD4]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">{error}</p>
        <button
          onClick={fetchRewards}
          className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed left-4 right-4 top-16 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#15140F]">Recompensas</h1>
        <p className="text-sm text-[#7A7770]">Canjea tus puntos por recompensas</p>
      </div>

      {/* Current points */}
      <div className="flex items-center justify-between rounded-2xl border border-[#E0DDD4] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE600]/20">
            <Star size={20} className="text-[#15140F]" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[#7A7770]">
              Tus puntos disponibles
            </div>
            <div className="text-2xl font-bold text-[#15140F]">
              {memberPoints.toLocaleString('es-ES')}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {rewards.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E0DDD4] bg-white py-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2EFE6]">
            <Gift size={24} className="text-[#A8A5A0]" />
          </div>
          <p className="text-sm text-[#7A7770]">No hay recompensas disponibles</p>
        </div>
      )}

      {/* Reward cards */}
      {rewards.map((reward) => {
        const canAfford = memberPoints >= reward.pointsCost;
        const outOfStock =
          reward.stockLimit !== null &&
          reward.currentStock !== null &&
          reward.currentStock <= 0;

        return (
          <div
            key={reward.id}
            className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-sm"
          >
            {/* Image */}
            <div className="flex h-36 items-center justify-center bg-[#F2EFE6]">
              {reward.imageUrl ? (
                <img
                  src={reward.imageUrl}
                  alt={reward.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Gift size={36} className="text-[#A8A5A0]" />
              )}
            </div>

            <div className="p-4">
              {/* Title and description */}
              <h3 className="text-base font-bold text-[#15140F]">{reward.title}</h3>
              {reward.description && (
                <p className="mt-1 text-xs text-[#7A7770]">{reward.description}</p>
              )}

              {/* Points cost */}
              <div className="mt-3 flex items-center gap-1.5">
                <Star size={14} className="text-[#FFE600]" />
                <span className="text-sm font-bold text-[#15140F]">
                  {reward.pointsCost.toLocaleString('es-ES')} puntos
                </span>
              </div>

              {/* Stock indicator */}
              {reward.stockLimit !== null && reward.currentStock !== null && (
                <p className="mt-1 text-[10px] text-[#A8A5A0]">
                  {reward.currentStock > 0
                    ? `${reward.currentStock} disponibles`
                    : 'Agotado'}
                </p>
              )}

              {/* Terms expandable */}
              {reward.terms && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleTerms(reward.id)}
                    className="flex items-center gap-1 text-xs font-medium text-[#7A7770] hover:text-[#15140F]"
                  >
                    Terminos y condiciones
                    {expandedTerms[reward.id] ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                  {expandedTerms[reward.id] && (
                    <p className="mt-1.5 rounded-lg bg-[#F2EFE6] p-3 text-xs text-[#7A7770]">
                      {reward.terms}
                    </p>
                  )}
                </div>
              )}

              {/* Action button */}
              <div className="mt-4">
                {outOfStock ? (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-500">
                    <AlertCircle size={16} />
                    Agotado
                  </div>
                ) : canAfford ? (
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={redeemingId === reward.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15140F] px-4 py-3 text-sm font-bold text-[#FAF8F2] transition hover:bg-[#2A2920] active:scale-[0.98] disabled:opacity-60"
                  >
                    {redeemingId === reward.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Gift size={16} />
                        Solicitar canje
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F2EFE6] px-4 py-3 text-sm font-medium text-[#7A7770]">
                    <AlertCircle size={16} />
                    Puntos insuficientes
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
