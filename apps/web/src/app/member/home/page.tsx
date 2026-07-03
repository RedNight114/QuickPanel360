'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Star, ChevronRight, Gamepad2, Target, Gift, Receipt } from 'lucide-react';
import { memberFetch, getMemberData } from '@/lib/member-api';
import { branding } from '@/lib/branding';

interface HomeData {
  member: {
    name: string;
    memberNumber: string;
    memberClass: string;
    points: number;
    lifetimePoints: number;
  };
  clubName: string;
  settings: {
    catalogEnabled: boolean;
    pointsEnabled: boolean;
    gamesEnabled: boolean;
    missionsEnabled: boolean;
    rewardsEnabled: boolean;
  };
}

const classColors: Record<string, { bg: string; text: string; border: string }> = {
  VIP: { bg: 'bg-[#FFE600]/20', text: 'text-[#15140F]', border: 'border-[#FFE600]' },
  Preferente: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  Estandar: { bg: 'bg-[#F2EFE6]', text: 'text-[#4A4840]', border: 'border-[#E0DDD4]' },
};

const quickActions = [
  { href: '/member/games', label: 'Juegos', icon: Gamepad2, desc: 'Gana puntos', settingsKey: 'gamesEnabled' as const },
  { href: '/member/missions', label: 'Misiones', icon: Target, desc: 'Retos activos', settingsKey: 'missionsEnabled' as const },
  { href: '/member/rewards', label: 'Recompensas', icon: Gift, desc: 'Canjea puntos', settingsKey: 'rewardsEnabled' as const },
  { href: '/member/redemptions', label: 'Mis canjes', icon: Receipt, desc: 'Solicitudes', settingsKey: 'rewardsEnabled' as const },
  { href: '/member/catalog', label: 'Catalogo', icon: Package, desc: 'Ver productos', settingsKey: 'catalogEnabled' as const },
  { href: '/member/points', label: 'Mis puntos', icon: Star, desc: 'Historial', settingsKey: 'pointsEnabled' as const },
];

export default function MemberHomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    memberFetch<HomeData>('/member-app/home')
      .then(setData)
      .catch((err) => {
        // Use cached data as fallback
        const cached = getMemberData();
        if (cached) {
          setData({
            member: {
              name: (cached.name as string) || 'Socio',
              memberNumber: (cached.memberNumber as string) || '',
              memberClass: (cached.memberClass as string) || 'Estandar',
              points: (cached.points as number) || 0,
              lifetimePoints: (cached.lifetimePoints as number) || 0,
            },
            clubName: (cached.clubName as string) || '',
            settings: {
              catalogEnabled: true,
              pointsEnabled: true,
              gamesEnabled: true,
              missionsEnabled: true,
              rewardsEnabled: true,
            },
          });
        } else {
          setError(err instanceof Error ? err.message : 'Error al cargar datos');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#E0DDD4]" />
        <div className="h-32 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[#E0DDD4]" />
          ))}
        </div>
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

  if (!data) return null;

  const cls = classColors[data.member.memberClass] || classColors.Estandar;
  const visibleActions = quickActions.filter((action) => data.settings[action.settingsKey]);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Greeting */}
      <div>
        <h1 className="text-lg font-bold text-[#15140F]">
          Hola, {data.member.name.split(' ')[0]}
        </h1>
        {data.clubName && (
          <p className="text-sm text-[#7A7770]">{data.clubName}</p>
        )}
      </div>

      {/* Member class badge */}
      <div className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls.bg} ${cls.text} ${cls.border}`}>
        <Star size={12} />
        {data.member.memberClass}
      </div>

      {/* Points card */}
      <div className="rounded-2xl border border-[#E0DDD4] bg-white p-5 shadow-sm">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[#7A7770]">
          Tus puntos
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#15140F]">
            {data.member.points.toLocaleString('es-ES')}
          </span>
          <span className="text-sm text-[#7A7770]">puntos actuales</span>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-[#F2EFE6] pt-3">
          <Star size={14} className="text-[#FFE600]" />
          <span className="text-xs text-[#7A7770]">
            {data.member.lifetimePoints.toLocaleString('es-ES')} puntos acumulados en total
          </span>
        </div>
      </div>

      {/* Quick access grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#15140F]">Acceso rapido</h2>
        <div className="grid grid-cols-2 gap-3">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col gap-2 rounded-xl border border-[#E0DDD4] bg-white p-4 shadow-sm transition hover:border-[#FFE600] hover:shadow-md"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2EFE6] transition group-hover:bg-[#FFE600]/20">
                  <Icon size={18} className="text-[#15140F]" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#15140F]">{action.label}</span>
                    <ChevronRight size={14} className="text-[#A8A5A0] transition group-hover:text-[#15140F]" />
                  </div>
                  <span className="text-xs text-[#7A7770]">{action.desc}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Branding footer */}
      <div className="mt-4 flex flex-col items-center gap-1 pb-4">
        <a
          href={`https://${branding.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-[#A8A5A0] transition-colors hover:text-[#7A7770]"
        >
          <img src="/branding/q-badge.svg" alt="" className="h-3 w-3 rounded-[2px] opacity-40" />
          <span>{branding.poweredBy}</span>
        </a>
      </div>
    </div>
  );
}
