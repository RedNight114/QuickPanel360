'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gift, Receipt, Settings2, Sparkles, Target } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

const tabs = [
  {
    href: '/settings/member-app',
    label: 'General',
    icon: Settings2,
    permission: 'member_app.manage',
  },
  {
    href: '/settings/member-app/games',
    label: 'Juegos',
    icon: Sparkles,
    permission: 'member_app.games.manage',
  },
  {
    href: '/settings/member-app/missions',
    label: 'Misiones',
    icon: Target,
    permission: 'member_app.missions.manage',
  },
  {
    href: '/settings/member-app/rewards',
    label: 'Recompensas',
    icon: Gift,
    permission: 'member_app.rewards.manage',
  },
  {
    href: '/settings/member-app/redemptions',
    label: 'Solicitudes',
    icon: Receipt,
    permission: 'member_app.redemptions.review',
  },
] as const;

export function MemberAppAdminNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const visibleTabs = tabs.filter((tab) => hasPermission(tab.permission));

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-2xl border border-border-light bg-surface p-2 shadow-sm">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            pathname === tab.href ||
            (tab.href !== '/settings/member-app' && pathname.startsWith(`${tab.href}/`));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-brand-primary text-brand-ink shadow-sm'
                  : 'text-text-secondary hover:bg-brand-primary/10 hover:text-text-primary'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
