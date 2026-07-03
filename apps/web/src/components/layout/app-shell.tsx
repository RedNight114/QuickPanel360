"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileSearch,
  GripVertical,
  Headphones,
  Layers,
  LayoutDashboard,
  LogOut,
  Bell,
  ReceiptText,
  HandCoins,
  Gauge,
  Menu,
  MessageCircle,
  MessageSquare,
  Package,
  Scale,
  Shield,
  Settings,
  Smartphone,
  Star,
  Users,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { BrandMark } from "@/components/branding/brand-mark";
import { PoweredBy } from "@/components/branding/powered-by";
import { Button } from "@/components/ui/button";
import { EmergencyGlobalButton } from "@/components/security/EmergencyGlobalButton";
import { HelpButton } from "@/components/help/help-panel";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { useChatConversations } from "@/hooks/useChat";
import { useSettings } from "@/hooks/useSettings";
import { branding } from "@/lib/branding";
import { buildInfo, shortSha } from "@/lib/version";
import { useAuth } from "@/providers/auth-provider";

type NavSection = { label: string; items: typeof navItems };

export const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
    moduleKey: "dashboard",
  },
  {
    href: "/pos",
    label: "Punto de dispensacion",
    icon: Scale,
    permission: "pos.sell",
    moduleKey: "pos",
  },
  {
    href: "/cash",
    label: "Caja",
    icon: Wallet,
    permission: "cash.summary.view",
    moduleKey: "cash",
  },
  {
    href: "/members",
    label: "Socios",
    icon: Users,
    permission: "members.read_basic",
    moduleKey: "members",
  },
  {
    href: "/products",
    label: "Productos e inventario",
    icon: Package,
    permission: "products.read_basic",
    moduleKey: "products",
    altPermission: "stock.read_basic",
    altModuleKey: "inventory",
  },
  {
    href: "/receivables",
    label: "Cuentas pendientes",
    icon: HandCoins,
    permission: "credit.view",
    moduleKey: "receivables",
  },
  {
    href: "/third-party-payments",
    label: "Aportaciones a terceros",
    icon: ReceiptText,
    permission: "third_party_payment.view",
    moduleKey: "third_party_payments",
  },
  {
    href: "/dispensations",
    label: "Historial dispensaciones",
    icon: ClipboardList,
    permission: "pos.history.read",
    moduleKey: "pos",
  },
  {
    href: "/notifications",
    label: "Centro de avisos",
    icon: Bell,
    permission: "notifications.view",
    moduleKey: "notifications",
  },
  {
    href: "/chat",
    label: "Chat interno",
    icon: MessageCircle,
    permission: "chat.view",
    moduleKey: "chat",
  },
  {
    href: "/analytics",
    label: "Analítica",
    icon: BarChart3,
    permission: "reports.view_limited",
    moduleKey: "analytics",
  },
  {
    href: "/users",
    label: "Colaboradores",
    icon: UserCog,
    permission: "users.read",
    moduleKey: "users",
  },
  {
    href: "/settings",
    label: "Configuracion",
    icon: Settings,
    permission: "settings.read",
    moduleKey: "settings",
  },
  {
    href: "/settings/member-app",
    label: "Portal del Socio",
    icon: Smartphone,
    permission: "member_app.view",
    moduleKey: "settings",
  },
  {
    href: "/security",
    label: "Seguridad",
    icon: Shield,
    permission: "audit.read",
    moduleKey: "security",
  },
  {
    href: "/audit",
    label: "Auditoria",
    icon: FileSearch,
    permission: "audit.read",
    moduleKey: "audit",
  },
];

export const navSections: NavSection[] = [
  {
    label: "Principal",
    items: navItems.filter((i) =>
      ["/dashboard", "/pos", "/cash"].includes(i.href),
    ),
  },
  {
    label: "Gestion",
    items: navItems.filter((i) =>
      [
        "/members",
        "/products",
        "/receivables",
        "/third-party-payments",
      ].includes(i.href),
    ),
  },
  {
    label: "Operativa",
    items: navItems.filter((i) =>
      ["/dispensations", "/notifications", "/chat", "/analytics"].includes(
        i.href,
      ),
    ),
  },
  {
    label: "Administracion",
    items: navItems.filter((i) =>
      ["/users", "/settings", "/settings/member-app", "/security", "/audit"].includes(i.href),
    ),
  },
];

const platformNavItems = [
  { href: "/platform", label: "Dashboard SaaS", icon: LayoutDashboard },
  { href: "/platform/tenants", label: "Empresas", icon: Building2 },
  { href: "/platform/accounts", label: "Cartera", icon: FileSearch },
  { href: "/platform/collections", label: "Recobro", icon: HandCoins },
  { href: "/platform/onboarding", label: "Onboarding", icon: ClipboardList },
  { href: "/platform/subscriptions", label: "Suscripciones", icon: Wallet },
  { href: "/platform/billing", label: "Facturacion", icon: ReceiptText },
  { href: "/platform/emergencies", label: "Emergencias", icon: Shield },
  {
    href: "/platform/audit",
    label: "Auditoria plataforma",
    icon: ClipboardList,
  },
  { href: "/platform/plans", label: "Planes", icon: Layers },
  { href: "/platform/modules", label: "Modulos", icon: Package },
  { href: "/platform/metrics", label: "Metricas", icon: Gauge },
  { href: "/platform/chat", label: "Chat", icon: MessageSquare },
  { href: "/platform/support", label: "Soporte", icon: Headphones },
  { href: "/platform/leads", label: "Solicitudes", icon: Users },
  { href: "/platform/settings", label: "Configuracion", icon: Settings },
];

const platformNavSections: Array<{ label: string; items: typeof platformNavItems }> = [
  {
    label: "Principal",
    items: platformNavItems.filter((i) =>
      ["/platform", "/platform/tenants", "/platform/onboarding"].includes(i.href),
    ),
  },
  {
    label: "Comercial",
    items: platformNavItems.filter((i) =>
      ["/platform/leads", "/platform/subscriptions", "/platform/accounts", "/platform/collections"].includes(i.href),
    ),
  },
  {
    label: "Facturacion",
    items: platformNavItems.filter((i) =>
      ["/platform/billing", "/platform/plans", "/platform/modules"].includes(i.href),
    ),
  },
  {
    label: "Operaciones",
    items: platformNavItems.filter((i) =>
      ["/platform/emergencies", "/platform/audit", "/platform/metrics", "/platform/chat", "/platform/support"].includes(i.href),
    ),
  },
  {
    label: "Configuracion",
    items: platformNavItems.filter((i) =>
      ["/platform/settings"].includes(i.href),
    ),
  },
];

function hexToRgb(value?: string | null) {
  const normalized = value?.trim().replace("#", "");
  if (!normalized || !/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const;
}

function rgbString(rgb: readonly [number, number, number]) {
  return rgb.join(" ");
}

function mixWithWhite(rgb: readonly [number, number, number], amount: number) {
  return rgb.map((channel) =>
    Math.round(channel + (255 - channel) * amount),
  ) as [number, number, number];
}

function mixWithBlack(rgb: readonly [number, number, number], amount: number) {
  return rgb.map((channel) => Math.round(channel * (1 - amount))) as [
    number,
    number,
    number,
  ];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const {
    tenant,
    user,
    logout,
    hasPermission,
    hasRole,
    stopImpersonation,
    impersonation,
    hasOriginalAuth,
  } = useAuth();
  const canReadSettings = hasPermission("settings.read");
  const { data: settingsData } = useSettings({ enabled: canReadSettings });
  const visibleTenantName =
    settingsData?.settings.displayName ||
    settingsData?.tenant.name ||
    tenant?.name ||
    "Club";
  const clubDensityCompact =
    settingsData?.settings.defaultDensity === "compact";
  const [userCompact, setUserCompact] = useState<boolean | null>(null);
  const [quickLinks, setQuickLinks] = useState<string[]>([]);
  const [hiddenLinks, setHiddenLinks] = useState<Set<string>>(new Set());
  const dragHref = useRef<string | null>(null);
  const [dragOverHref, setDragOverHref] = useState<string | null>(null);

  useEffect(() => {
    function loadPrefs() {
      const raw = localStorage.getItem("pref:compact");
      setUserCompact(raw === null ? null : raw === "true");
      try {
        const stored = localStorage.getItem("pref:quickLinks");
        setQuickLinks(stored ? (JSON.parse(stored) as string[]) : []);
      } catch {
        setQuickLinks([]);
      }
      try {
        const sidebarRaw = localStorage.getItem("pref:sidebarLinks");
        if (sidebarRaw) {
          const parsed = JSON.parse(sidebarRaw);
          setHiddenLinks(new Set(parsed.hidden ?? []));
        }
      } catch {}
    }
    loadPrefs();
    window.addEventListener("storage", loadPrefs);
    return () => window.removeEventListener("storage", loadPrefs);
  }, []);


  const densityClass =
    (userCompact ?? clubDensityCompact) ? "density-compact" : "";
  const isSuperadmin = hasRole("SUPERADMIN");
  const canViewNotifications =
    isSuperadmin || hasPermission("notifications.view");
  const enabledModules = tenant?.enabledModules;
  const { data: chatConversations } = useChatConversations(
    !isSuperadmin && hasPermission("chat.view"),
  );
  const unreadChats =
    chatConversations?.reduce(
      (sum, conversation) => sum + conversation.unreadCount,
      0,
    ) ?? 0;
  const tenantTheme = useMemo<CSSProperties>(() => {
    if (isSuperadmin) {
      return {};
    }

    const customPrimary = settingsData?.settings?.primaryColor;
    const customAccent = settingsData?.settings?.accentColor;
    const brandPrimary =
      hexToRgb(customPrimary) ?? hexToRgb(branding.yellow) ?? ([250, 204, 21] as const);
    const brandHover =
      hexToRgb(customAccent) ?? hexToRgb(branding.ink) ?? mixWithBlack(brandPrimary, 0.08);

    return {
      "--primary": customPrimary || branding.yellow,
      "--ring": customPrimary || branding.yellow,
      "--brand-primary-rgb": rgbString(brandPrimary),
      "--brand-hover-rgb": rgbString(brandHover),
      "--brand-light-rgb": rgbString(hexToRgb(branding.border) ?? mixWithWhite(brandPrimary, 0.35)),
      "--brand-lighter-rgb": rgbString(hexToRgb(branding.surface) ?? mixWithWhite(brandPrimary, 0.82)),
      "--sidebar-primary": customPrimary || branding.yellow,
      "--sidebar-primary-foreground": customAccent || branding.ink,
    } as CSSProperties;
  }, [isSuperadmin, settingsData?.settings?.primaryColor, settingsData?.settings?.accentColor]);

  function isModuleEnabled(moduleKey: string) {
    return !enabledModules || enabledModules.includes(moduleKey);
  }

  const visibleItems = isSuperadmin
    ? platformNavItems
    : navItems.filter((item) => {
        const moduleOk =
          isModuleEnabled(item.moduleKey) ||
          ("altModuleKey" in item && item.altModuleKey
            ? isModuleEnabled(item.altModuleKey)
            : false);
        if (!moduleOk) return false;

        if (item.href === "/settings") return canReadSettings;

        if (item.href === "/security") {
          return (
            hasRole("OWNER") ||
            hasPermission("audit.read") ||
            hasPermission("emergency.view") ||
            hasPermission("emergency.activate") ||
            hasPermission("access.regenerate")
          );
        }

        if (hasRole("OWNER")) return true;

        const permOk =
          hasPermission(item.permission) ||
          ("altPermission" in item && item.altPermission
            ? hasPermission(item.altPermission)
            : false);
        return permOk;
      });

  const allNavItems = isSuperadmin ? platformNavItems : navItems;

  function renderNavItems(onNavigate?: () => void) {
    return visibleItems.map((item) => {
      const Icon = item.icon;
      const active =
        pathname === item.href ||
        pathname.startsWith(item.href + "/") ||
        ("altModuleKey" in item &&
          item.altModuleKey === "inventory" &&
          pathname.startsWith("/inventory"));
      const isFav = quickLinks.includes(item.href);

      if ("disabled" in item && item.disabled) {
        return (
          <span
            key={item.href}
            className="flex h-9 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-text-muted opacity-50"
            title="Disponible proximamente"
          >
            <Icon size={18} />
            <span className="truncate">{item.label}</span>
          </span>
        );
      }

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={clsx(
            "flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all",
            active
              ? "bg-[#FFE600]/15 text-[#15140F] font-semibold"
              : "text-text-secondary hover:bg-bg-soft hover:text-text-primary",
          )}
        >
          <Icon size={16} />
          <span className="truncate">{item.label}</span>
          {item.href === "/chat" && unreadChats > 0 ? (
            <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#15140F] px-1.5 text-[10px] font-bold text-white">
              {unreadChats}
            </span>
          ) : isFav ? (
            <Star
              size={10}
              className="ml-auto shrink-0 fill-[#FFE600] text-[#FFE600] opacity-50"
            />
          ) : null}
        </Link>
      );
    });
  }

  function saveQuickLinks(next: string[]) {
    localStorage.setItem("pref:quickLinks", JSON.stringify(next));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "pref:quickLinks",
        newValue: JSON.stringify(next),
      }),
    );
  }

  function renderFavorites(onNavigate?: () => void) {
    if (quickLinks.length === 0) return null;
    const favItems = quickLinks
      .map((href) => allNavItems.find((item) => item.href === href))
      .filter(Boolean) as typeof allNavItems;
    if (favItems.length === 0) return null;

    return (
      <div className="mb-2">
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Favoritos
        </p>
        {favItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isOver =
            dragOverHref === item.href && dragHref.current !== item.href;

          return (
            <div
              key={`fav-${item.href}`}
              draggable
              onDragStart={() => {
                dragHref.current = item.href;
              }}
              onDragEnd={() => {
                dragHref.current = null;
                setDragOverHref(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverHref(item.href);
              }}
              onDragLeave={() => setDragOverHref(null)}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragHref.current;
                if (!from || from === item.href) return;
                const next = [...quickLinks];
                const fromIdx = next.indexOf(from);
                const toIdx = next.indexOf(item.href);
                if (fromIdx === -1 || toIdx === -1) return;
                next.splice(fromIdx, 1);
                next.splice(toIdx, 0, from);
                saveQuickLinks(next);
                setDragOverHref(null);
              }}
              className={clsx(
                "group relative flex h-10 cursor-grab items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all active:cursor-grabbing",
                active
                  ? "bg-[#FFE600]/15 text-[#15140F] font-semibold"
                  : "text-text-secondary hover:bg-bg-soft hover:text-text-primary",
                isOver && "ring-2 ring-[#FFE600] ring-inset",
              )}
            >
              <GripVertical
                size={13}
                className="absolute left-1 shrink-0 text-text-muted opacity-0 transition group-hover:opacity-60"
              />
              <Link
                href={item.href}
                onClick={onNavigate}
                className="flex min-w-0 flex-1 items-center gap-3"
                draggable={false}
              >
                <Icon size={18} />
                <span className="truncate">{item.label}</span>
              </Link>
            </div>
          );
        })}
        <div className="my-3 border-t border-border-light" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen overflow-x-hidden xl:grid xl:grid-cols-[260px_minmax(0,1fr)] ${densityClass}`}
      style={tenantTheme}
    >
      {/* -- Desktop sidebar -------------------------------------- */}
      <aside className="hidden flex-col border-r border-border-light bg-[#FAF8F2] xl:flex xl:min-h-screen">
        <div className="flex items-center gap-3 px-4 py-4">
          <BrandMark variant="badge" size={36} className="h-9 w-9 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-primary">
              {isSuperadmin ? "Plataforma" : visibleTenantName}
            </p>
            <p className="text-[10px] font-medium text-text-muted">{branding.appName}</p>
          </div>
        </div>

        <div className="mx-3 border-t border-border-light" />
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Navegación principal">
          {renderFavorites()}
          {isSuperadmin ? (
            platformNavSections.map((section) => {
              if (section.items.length === 0) return null;
              return (
                <div key={section.label} className="mb-4">
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/70">
                    {section.label}
                  </p>
                  <div className="grid gap-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={clsx(
                            "relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all",
                            active
                              ? "bg-[#FFE600]/15 text-[#15140F] font-semibold"
                              : "text-text-secondary hover:bg-bg-soft hover:text-text-primary",
                          )}
                        >
                          {active ? <span className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r-full bg-brand-primary" aria-hidden="true" /> : null}
                          <Icon size={16} aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            navSections.map((section) => {
              const sectionItems = section.items.filter((item) => {
                if (hiddenLinks.has(item.href)) return false;
                const moduleOk =
                  isModuleEnabled(item.moduleKey) ||
                  ("altModuleKey" in item && item.altModuleKey
                    ? isModuleEnabled(item.altModuleKey)
                    : false);
                if (!moduleOk) return false;
                if (item.href === "/settings") return canReadSettings;
                if (item.href === "/security")
                  return (
                    hasRole("OWNER") ||
                    hasPermission("audit.read") ||
                    hasPermission("emergency.view") ||
                    hasPermission("emergency.activate") ||
                    hasPermission("access.regenerate")
                  );
                if (hasRole("OWNER")) return true;
                return (
                  hasPermission(item.permission) ||
                  ("altPermission" in item && item.altPermission
                    ? hasPermission(item.altPermission)
                    : false)
                );
              });
              if (sectionItems.length === 0) return null;
              return (
                <div key={section.label} className="mb-4">
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/70">
                    {section.label}
                  </p>
                  <div className="grid gap-0.5">
                    {sectionItems.map((item) => {
                      const Icon = item.icon;
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/") ||
                        ("altModuleKey" in item &&
                          item.altModuleKey === "inventory" &&
                          pathname.startsWith("/inventory"));
                      const isFav = quickLinks.includes(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={clsx(
                            "relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all",
                            active
                              ? "bg-[#FFE600]/15 text-[#15140F] font-semibold"
                              : "text-text-secondary hover:bg-bg-soft hover:text-text-primary",
                          )}
                        >
                          {active ? <span className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r-full bg-[#FFE600]" /> : null}
                          <Icon size={16} />
                          <span className="truncate">{item.label}</span>
                          {item.href === "/chat" && unreadChats > 0 ? (
                            <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#15140F] px-1.5 text-[10px] font-bold text-white">
                              {unreadChats}
                            </span>
                          ) : isFav ? (
                            <Star
                              size={10}
                              className="ml-auto shrink-0 fill-[#FFE600] text-[#FFE600] opacity-50"
                            />
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </nav>

        <div className="border-t border-border-light px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
              <span>Sistema activo</span>
            </div>
            <span
              className="cursor-default text-[9px] text-text-muted/60"
              title={`v${buildInfo.version} · ${buildInfo.environment} · ${shortSha(buildInfo.commitSha)}`}
            >
              v{buildInfo.version}
            </span>
          </div>
          <PoweredBy className="mt-2" />
        </div>
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-label="Cerrar navegacion"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(300px,calc(100vw-2rem))] flex-col border-r border-border-light bg-[#FAF8F2] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border-light px-4 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <BrandMark variant="badge" size={36} className="h-9 w-9 rounded-xl" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {isSuperadmin ? "Plataforma" : visibleTenantName}
                  </p>
                  <p className="text-[10px] text-text-muted">{branding.appName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Cerrar menu"
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-soft hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {renderFavorites(() => setMobileNavOpen(false))}
              {renderNavItems(() => setMobileNavOpen(false))}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 min-h-screen bg-gradient-to-b from-[#FAF8F2] to-[#F2EFE6]">
        {impersonation && hasOriginalAuth ? (
          <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:px-5 md:flex-row md:items-center md:justify-between">
            <span>
              Soporte activo en {impersonation.tenantName}. Todas las acciones
              quedan auditadas.
            </span>
            <Button variant="outline" size="sm" onClick={stopImpersonation}>
              Volver a plataforma
            </Button>
          </div>
        ) : null}
        <header className="sticky top-0 z-30 border-b border-border-light bg-[#FAF8F2]/88 backdrop-blur-lg px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border-light text-text-muted transition hover:bg-bg-soft hover:text-text-primary xl:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileNavOpen}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1" />
            <div className="flex items-center gap-1.5">
              {isSuperadmin ? (
                <span className="rounded-full border border-brand-light bg-brand-lighter px-3 py-1 text-[11px] font-semibold text-brand-primary">
                  SUPERADMIN
                </span>
              ) : (
                <>
                  <HelpButton />
                  <NotificationsBell enabled={canViewNotifications} />
                  <EmergencyGlobalButton compact />
                </>
              )}
              <div className="hidden h-5 w-px bg-border-light sm:block mx-1" />
              <Link
                href="/profile"
                className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-lighter text-brand-primary text-[11px] font-bold ring-2 ring-white">
                  {(user?.name ?? "U")[0].toUpperCase()}
                </div>
                <span className="hidden font-medium text-[13px] sm:inline">
                  {user?.name ?? "Perfil"}
                </span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:text-red-500"
                title="Salir"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="relative min-w-0 overflow-x-hidden p-3 sm:p-4 lg:p-6">
          {children}
          <div className="mt-8 flex items-center justify-center pb-2">
            <PoweredBy />
          </div>
        </main>
      </div>
    </div>
  );
}
