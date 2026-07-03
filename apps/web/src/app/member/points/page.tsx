'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { memberFetch } from '@/lib/member-api';

interface Transaction {
  id: string;
  date: string;
  reason: string;
  points: number;
}

interface PointsData {
  currentPoints: number;
  lifetimePoints: number;
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

function getLevel(lifetime: number): { name: string; color: string; bg: string } {
  if (lifetime >= 500) return { name: 'Destacado', color: 'text-[#15140F]', bg: 'bg-[#FFE600]/20 border-[#FFE600]' };
  if (lifetime >= 100) return { name: 'Activo', color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200' };
  return { name: 'Inicial', color: 'text-[#4A4840]', bg: 'bg-[#F2EFE6] border-[#E0DDD4]' };
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function MemberPointsPage() {
  const [data, setData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchPoints = useCallback((p: number) => {
    setLoading(true);
    setError(null);
    memberFetch<PointsData>(`/member-app/points?page=${p}&limit=${limit}`)
      .then((res) => {
        setData(res);
        setPage(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar puntos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPoints(1);
  }, [fetchPoints]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-32 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        <div className="h-12 animate-pulse rounded-xl bg-[#E0DDD4]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[#E0DDD4]" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">{error}</p>
        <button
          onClick={() => fetchPoints(1)}
          className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const level = getLevel(data.lifetimePoints);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#15140F]">Mis puntos</h1>
        <p className="text-sm text-[#7A7770]">Historial de puntos y nivel</p>
      </div>

      {/* Points summary card */}
      <div className="rounded-2xl border border-[#E0DDD4] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[#7A7770]">
              Puntos actuales
            </div>
            <div className="mt-1 text-4xl font-bold text-[#15140F]">
              {data.currentPoints.toLocaleString('es-ES')}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE600]/20">
            <Star size={20} className="text-[#15140F]" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#F2EFE6] pt-3">
          <div className="flex items-center gap-1.5 text-xs text-[#7A7770]">
            <Award size={12} />
            {data.lifetimePoints.toLocaleString('es-ES')} puntos acumulados en total
          </div>
        </div>
      </div>

      {/* Level badge */}
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${level.bg}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <Award size={18} className={level.color} />
        </div>
        <div>
          <div className={`text-sm font-bold ${level.color}`}>Nivel: {level.name}</div>
          <div className="text-xs text-[#7A7770]">
            {data.lifetimePoints < 100
              ? `${100 - data.lifetimePoints} puntos mas para nivel Activo`
              : data.lifetimePoints < 500
                ? `${500 - data.lifetimePoints} puntos mas para nivel Destacado`
                : 'Has alcanzado el nivel maximo'}
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#15140F]">Historial</h2>

        {data.transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E0DDD4] bg-white py-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2EFE6]">
              <Star size={24} className="text-[#A8A5A0]" />
            </div>
            <p className="text-sm text-[#7A7770]">Aun no tienes movimientos de puntos</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl border border-[#E0DDD4] bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      tx.points > 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {tx.points > 0 ? (
                      <TrendingUp size={14} className="text-green-600" />
                    ) : (
                      <TrendingDown size={14} className="text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#15140F]">{tx.reason}</div>
                    <div className="text-xs text-[#7A7770]">{formatDate(tx.date)}</div>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ${
                    tx.points > 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {tx.points > 0 ? '+' : ''}
                  {tx.points}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => fetchPoints(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-[#E0DDD4] bg-white px-3 py-2 text-xs font-medium text-[#15140F] transition hover:bg-[#F2EFE6] disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <span className="text-xs text-[#7A7770]">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => fetchPoints(page + 1)}
              disabled={page >= data.totalPages || loading}
              className="flex items-center gap-1 rounded-lg border border-[#E0DDD4] bg-white px-3 py-2 text-xs font-medium text-[#15140F] transition hover:bg-[#F2EFE6] disabled:opacity-40"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
