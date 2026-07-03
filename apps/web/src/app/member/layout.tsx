'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Gamepad2, Gift, CreditCard, User, Target, Receipt, Star, Trophy } from 'lucide-react';
import { getMemberTenantId, getMemberToken, memberFetch } from '@/lib/member-api';
import { InstallBanner } from '@/components/pwa/install-banner';
import { usePushSubscription } from '@/hooks/usePushSubscription';

interface MemberAppSettings {
  enabled: boolean;
  catalogEnabled: boolean;
  pointsEnabled: boolean;
  digitalCardEnabled: boolean;
  allowProfileEdit: boolean;
  gamesEnabled: boolean;
  missionsEnabled: boolean;
  rewardsEnabled: boolean;
}

interface HomeResponse {
  settings: MemberAppSettings;
  [key: string]: unknown;
}

const allNavItems = [
  { href: '/member/home', label: 'Inicio', icon: Home, settingsKey: null },
  { href: '/member/games', label: 'Juegos', icon: Gamepad2, settingsKey: 'gamesEnabled' as const },
  { href: '/member/missions', label: 'Misiones', icon: Target, settingsKey: 'missionsEnabled' as const },
  { href: '/member/rewards', label: 'Recompensas', icon: Gift, settingsKey: 'rewardsEnabled' as const },
  { href: '/member/redemptions', label: 'Canjes', icon: Receipt, settingsKey: 'rewardsEnabled' as const },
  { href: '/member/leaderboard', label: 'Ranking', icon: Trophy, settingsKey: 'pointsEnabled' as const },
  { href: '/member/points', label: 'Puntos', icon: Star, settingsKey: 'pointsEnabled' as const },
  { href: '/member/card', label: 'Carnet', icon: CreditCard, settingsKey: 'digitalCardEnabled' as const },
  { href: '/member/profile', label: 'Perfil', icon: User, settingsKey: null },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<MemberAppSettings | null>(null);
  const [portalDisabled, setPortalDisabled] = useState(false);

  const getMemberHeaders = useCallback((): Record<string, string> => {
    const token = getMemberToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  usePushSubscription({
    mode: 'member',
    getAuthHeaders: getMemberHeaders,
    enabled: ready && pathname !== '/member/login',
  });

  useEffect(() => {
    const token = localStorage.getItem('member:token');
    if (!token && pathname !== '/member/login') {
      const tenantId = getMemberTenantId();
      router.replace(tenantId ? `/member/login?t=${tenantId}` : '/member/login');
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (pathname === '/member/login') return;
    const token = localStorage.getItem('member:token');
    if (!token) return;

    memberFetch<HomeResponse>('/member-app/home')
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
          if (!data.settings.enabled) {
            setPortalDisabled(true);
          }
        }
      })
      .catch(() => {
        // If fetch fails, allow navigation with all items visible
      });
  }, [pathname]);

  if (pathname === '/member/login') return <>{children}</>;

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF8F2]">
        <p className="text-sm text-[#7A7770]">Cargando...</p>
      </div>
    );
  }

  if (portalDisabled) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#FAF8F2]">
        <header className="flex items-center justify-between border-b border-[#E0DDD4] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/branding/q-badge.svg" alt="" className="h-7 w-7 rounded-lg" />
            <span className="text-sm font-bold text-[#15140F]">Portal del Socio</span>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-2xl border border-[#E0DDD4] bg-white p-8 shadow-sm">
            <p className="text-base font-semibold text-[#15140F]">
              El Portal del Socio no esta disponible actualmente.
            </p>
            <p className="mt-2 text-sm text-[#7A7770]">
              Contacta con tu club para mas informacion.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const navItems = allNavItems.filter((item) => {
    if (!item.settingsKey) return true;
    if (!settings) return true; // show all while loading
    return settings[item.settingsKey] === true;
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FAF8F2]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#E0DDD4] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/branding/q-badge.svg" alt="" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-bold text-[#15140F]">Portal del Socio</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <InstallBanner />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E0DDD4] bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[68px] shrink-0 flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition ${
                  active ? 'text-[#15140F]' : 'text-[#A8A5A0]'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                {item.label}
                {active ? <div className="h-0.5 w-4 rounded-full bg-[#FFE600]" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
