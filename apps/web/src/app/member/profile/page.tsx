'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, Calendar, Hash, Star, Shield, Clock } from 'lucide-react';
import { memberFetch } from '@/lib/member-api';

interface ProfileData {
  name: string;
  memberNumber: string;
  memberClass: string;
  status: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  joinDate: string;
  avatar: string | null;
  points: number;
  lifetimePoints: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-green-100 text-green-800' },
  INACTIVE: { label: 'Inactivo', color: 'bg-gray-100 text-gray-600' },
  SUSPENDED: { label: 'Suspendido', color: 'bg-red-100 text-red-700' },
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
};

export default function MemberProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    memberFetch<ProfileData>('/member-app/profile')
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar perfil'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-[#E0DDD4]" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-32 animate-pulse rounded bg-[#E0DDD4]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#E0DDD4]" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[#E0DDD4]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const status = statusLabels[profile.status] || statusLabels.ACTIVE;
  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const infoItems = [
    { icon: Hash, label: 'Numero de socio', value: profile.memberNumber },
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Phone, label: 'Telefono', value: profile.phone || '-' },
    { icon: Calendar, label: 'Fecha de nacimiento', value: formatDate(profile.birthday) },
    { icon: Clock, label: 'Socio desde', value: formatDate(profile.joinDate) },
  ];

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="h-16 w-16 rounded-full border-2 border-[#E0DDD4] object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#15140F] text-lg font-bold text-[#FAF8F2]">
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-[#15140F]">{profile.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#E0DDD4] bg-[#F2EFE6] px-2.5 py-0.5 text-xs font-medium text-[#4A4840]">
              <Star size={10} className="text-[#FFE600]" />
              {profile.memberClass}
            </span>
          </div>
        </div>
      </div>

      {/* Points summary */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border border-[#E0DDD4] bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-[#7A7770]">Puntos actuales</div>
          <div className="mt-1 text-xl font-bold text-[#15140F]">
            {profile.points.toLocaleString('es-ES')}
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-[#E0DDD4] bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-[#7A7770]">Acumulados</div>
          <div className="mt-1 text-xl font-bold text-[#15140F]">
            {profile.lifetimePoints.toLocaleString('es-ES')}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-[#E0DDD4] bg-white shadow-sm">
        <div className="border-b border-[#F2EFE6] px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#15140F]">
            <Shield size={14} />
            Informacion personal
          </h2>
        </div>
        <div className="divide-y divide-[#F2EFE6]">
          {infoItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 px-5 py-3.5">
                <Icon size={16} className="shrink-0 text-[#A8A5A0]" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[#7A7770]">{item.label}</div>
                  <div className="truncate text-sm font-medium text-[#15140F]">
                    {item.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
