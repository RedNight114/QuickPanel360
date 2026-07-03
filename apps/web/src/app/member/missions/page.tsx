'use client';

import { useEffect, useState, useCallback } from 'react';
import { Target, CheckCircle2, Clock, Pause, Star } from 'lucide-react';
import { memberFetch } from '@/lib/member-api';

interface MissionProgress {
  progress: number;
  completedAt: string | null;
}

interface Mission {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  pointsReward: number;
  targetValue: number;
  memberProgress: MissionProgress | null;
}

interface MissionsResponse {
  missions: Mission[];
}

function getStatusInfo(mission: Mission): {
  label: string;
  color: string;
  bg: string;
  icon: typeof CheckCircle2;
} {
  if (mission.memberProgress?.completedAt) {
    return {
      label: 'Completada',
      color: 'text-green-700',
      bg: 'bg-green-50',
      icon: CheckCircle2,
    };
  }
  if (mission.status === 'PAUSED') {
    return {
      label: 'Pausada',
      color: 'text-[#7A7770]',
      bg: 'bg-gray-100',
      icon: Pause,
    };
  }
  return {
    label: 'En progreso',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: Clock,
  };
}

export default function MemberMissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(() => {
    setLoading(true);
    setError(null);
    memberFetch<MissionsResponse>('/member-app/missions')
      .then((res) => setMissions(res.missions))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar misiones'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[#E0DDD4]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">{error}</p>
        <button
          onClick={fetchMissions}
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
        <h1 className="text-lg font-bold text-[#15140F]">Misiones</h1>
        <p className="text-sm text-[#7A7770]">Completa misiones y gana puntos extra</p>
      </div>

      {/* Empty state */}
      {missions.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E0DDD4] bg-white py-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2EFE6]">
            <Target size={24} className="text-[#A8A5A0]" />
          </div>
          <p className="text-sm text-[#7A7770]">No hay misiones activas</p>
        </div>
      )}

      {/* Mission cards */}
      {missions.map((mission) => {
        const statusInfo = getStatusInfo(mission);
        const StatusIcon = statusInfo.icon;
        const progress = mission.memberProgress?.progress ?? 0;
        const isCompleted = !!mission.memberProgress?.completedAt;
        const progressPercent = Math.min(
          100,
          mission.targetValue > 0 ? (progress / mission.targetValue) * 100 : 0,
        );

        return (
          <div
            key={mission.id}
            className={`rounded-2xl border bg-white shadow-sm ${
              isCompleted ? 'border-green-200' : 'border-[#E0DDD4]'
            }`}
          >
            <div className="p-4">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isCompleted ? 'bg-green-50' : 'bg-[#F2EFE6]'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} className="text-green-600" />
                    ) : (
                      <Target size={20} className="text-[#15140F]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#15140F]">{mission.title}</h3>
                    {mission.description && (
                      <p className="mt-0.5 text-xs text-[#7A7770]">
                        {mission.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                >
                  <StatusIcon size={10} />
                  {statusInfo.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-[#7A7770]">
                    {progress} / {mission.targetValue}
                  </span>
                  <span className="text-xs font-medium text-[#15140F]">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F2EFE6]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-green-500' : 'bg-[#FFE600]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Points reward */}
              <div className="mt-3 flex items-center gap-1.5">
                <Star size={12} className="text-[#FFE600]" />
                <span className="text-xs font-semibold text-[#15140F]">
                  +{mission.pointsReward} puntos
                </span>
                {isCompleted && (
                  <span className="text-xs text-green-600"> - Puntos acreditados</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
