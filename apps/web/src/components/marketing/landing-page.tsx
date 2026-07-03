"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Globe,
  Lock,
  Mail,
  MessageCircle,
  Package,
  PhoneCall,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { nl } from "@/i18n/nl";
import { branding } from "@/lib/branding";
import { HeroIllustration } from "./illustrations";
import { ChatPreview, DashboardPreview, PosPreview, SecurityPreview } from "./module-previews";
import {
  PrivacyDocument,
  TermsDocument,
  legalLastUpdated,
} from "@/components/marketing/legal-documents";

type Plan = {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: number;
  priceAnnual?: number | null;
  maxUsers?: number | null;
  maxProducts?: number | null;
  marketingTitle?: string | null;
  marketingDescription?: string | null;
  isRecommended: boolean;
  ctaLabel?: string | null;
  offerLabel?: string | null;
  modules: Array<{ id: string; name: string }>;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const COOKIE_STORAGE_KEY = "qp360.cookie.preferences";

const icons: Record<string, typeof Scale> = {
  dashboard: BarChart3,
  pos: Scale,
  cash: Wallet,
  members: Users,
  products: Package,
  analytics: BarChart3,
  chat: MessageCircle,
  notifications: Bell,
  security: Shield,
  platform: ShieldCheck,
};

const productModules = [
  "dashboard",
  "pos",
  "cash",
  "members",
  "inventory",
  "analytics",
  "chat",
  "security",
] as const;

type Locale = "es" | "en" | "nl";
type Messages = typeof es;
const messages: Record<Locale, Messages> = { es, en, nl };
const locales: Locale[] = ["es", "en", "nl"];

const localeLabels: Record<Locale, string> = {
  es: "Espanol",
  en: "English",
  nl: "Nederlands",
};

const landingCopy = {
  es: {
    announcement: "Onboarding manual, acceso privado y activacion asistida por QuickAgence",
    announcementCta: "Solicitar demo",
    heroBadge: "Software operativo para clubes privados",
    heroTitle: "Una operativa mas ordenada, segura y profesional desde el primer dia.",
    heroBody:
      "QuickPanel360 centraliza dispensacion, caja, socios, inventario, seguridad y supervision del equipo en un unico panel. Menos dispersion operativa, mas trazabilidad y mejor control para el personal responsable.",
    heroPrimary: "Solicitar demo comercial",
    heroSecondary: "Ver producto",
    heroPoints: ["Alta guiada", "Cobros manuales", "Soporte humano"],
    professionalBadges: [
      "Onboarding asistido",
      "Acceso privado por empresa",
      "Cobro y alta manual",
      "Revision comercial personalizada",
    ],
    trustTitle: "Hecho para operaciones reales, no para demos bonitas",
    trustBody:
      "La plataforma esta pensada para equipos que necesitan registrar, revisar, cuadrar y responder rapido durante la jornada.",
    trustCards: [
      { title: "Activacion asistida", desc: "Cada solicitud se revisa manualmente y el espacio se configura segun el contexto operativo." },
      { title: "Producto visible", desc: "La web muestra modulos y flujos reales, no humo de marketing." },
      { title: "Operacion trazable", desc: "Cada accion importante deja rastro y contexto." },
    ],
    painTitle: "Lo que normalmente se rompe sin un panel central",
    painBody:
      "Cuando el club depende de mensajes sueltos, memoria del equipo y procesos manuales, las incidencias se multiplican.",
    pains: [
      "Inventario sin contexto y avisos demasiado tarde.",
      "Caja y aportaciones con revisiones lentas o inconsistentes.",
      "Dispensaciones sin trazabilidad clara por socio o colaborador.",
      "Cambios de turno con informacion perdida.",
    ],
    outcomesTitle: "Lo que cambia cuando el producto esta bien implantado",
    outcomes: [
      "Mas claridad operativa desde el dashboard.",
      "Menos errores de caja, stock y seguimiento.",
      "Accesos y permisos mas controlados.",
      "Mejor capacidad de supervision para responsables.",
    ],
    productTitle: "Muestra el producto con contexto, no solo con promesas",
    productBody:
      "Desde la landing el posible cliente entiende que hay flujo de trabajo, seguridad, seguimiento y modulos concretos listos para usar.",
    spotlightTitle: "Vistas que ayudan a vender la plataforma",
    spotlightCards: [
      { title: "Dispensacion controlada", desc: "Peso, validaciones y cierre de operacion con menos margen de error." },
      { title: "Equipo coordinado", desc: "Chat interno, avisos y contexto operativo en una sola capa de trabajo." },
      { title: "Responsables con visibilidad", desc: "KPIs, actividad y alertas para tomar decisiones rapidas." },
    ],
    securityTitle: "Seguridad entendible para quien contrata",
    securityBody:
      "No hace falta explicar criptografia avanzada para transmitir confianza. Hace falta mostrar controles claros, aislamiento y trazabilidad.",
    plansTitle: "Planes claros para una venta mas sencilla",
    plansBody:
      "La contratacion es manual y acompanada. Los planes sirven para orientar alcance, capacidad y ritmo de crecimiento.",
    contactTitle: "Evaluacion comercial y operativa con QuickAgence",
    contactBody:
      "Cuanto mas claro sea el contexto operativo del club, mejor podra prepararse una demo util y una propuesta ajustada.",
    contactPanelTitle: "Antes de la demo",
    contactPanelItems: [
      "Revisamos la solicitud manualmente.",
      "Confirmamos necesidades, plan y capacidad.",
      "Coordinamos alta, cobro manual y activacion.",
    ],
    contactPanelFoot:
      "El canal principal de contacto es contact@quickagence.com. Cada solicitud se revisa antes de proponer demo, activacion o plan recomendado.",
    formTitle: "Solicitar acceso o demo",
    formSubtitle: "El formulario permite iniciar una revision comercial y preparar una propuesta coherente con la operativa del club.",
    formHints: ["Demo comercial", "Cambio de software", "Orden operativo de caja e inventario"],
    faqLead: "Dudas habituales antes de iniciar una evaluacion comercial y operativa.",
    footerNote: "QuickPanel360 by QuickAgence. Operacion, seguridad y trazabilidad en una sola plataforma.",
    legalPrivacy: "Privacidad",
    legalTerms: "Terminos",
    legalCookies: "Cookies",
    cookieTitle: "Privacidad y consentimiento",
    cookieBody:
      "Se utiliza almacenamiento tecnico para idioma, consentimiento y experiencia basica. Las preferencias pueden configurarse o aceptarse en bloque.",
    cookieNecessary: "Necesarias",
    cookieAnalytics: "Analitica",
    cookieMarketing: "Marketing",
    cookieAcceptAll: "Aceptar todo",
    cookieEssential: "Solo necesarias",
    cookieManage: "Configurar",
    cookieSave: "Guardar preferencias",
    cookieLocalControl: "Control local",
    cookieLocalNote:
      "La configuracion se guarda en este navegador y puede modificarse en cualquier momento desde el pie de la landing.",
    cookieNecessaryDesc: "Siempre activas para idioma, dialogos legales y experiencia esencial.",
    cookieAnalyticsDesc: "Reservadas para medicion basica cuando se habilite en esta web.",
    cookieMarketingDesc: "Reservadas para futuras acciones comerciales. No se activan por defecto.",
    closeLabel: "Cerrar",
    legalModalPrivacyTitle: "Politica de Privacidad",
    legalModalTermsTitle: "Terminos y Condiciones",
  },
  en: {
    announcement: "Manual onboarding, private access and assisted activation by QuickAgence",
    announcementCta: "Request demo",
    heroBadge: "Operational software for private clubs",
    heroTitle: "Sell a more organised, secure and professional operation from day one.",
    heroBody:
      "QuickPanel360 centralises dispensing, cash, members, inventory, security and team oversight in one panel. No scattered sheets, no fragmented workflows and less friction for your staff.",
    heroPrimary: "Request commercial demo",
    heroSecondary: "View product",
    heroPoints: ["Guided setup", "Manual billing", "Human support"],
    professionalBadges: [
      "Assisted onboarding",
      "Private workspace per company",
      "Manual billing and activation",
      "Human commercial review",
    ],
    trustTitle: "Built for real operations, not just polished mockups",
    trustBody:
      "The platform is designed for teams that need to register, review, reconcile and respond quickly during the working day.",
    trustCards: [
      { title: "Assisted activation", desc: "Every request is reviewed manually and the workspace is configured according to the operating context." },
      { title: "Visible product", desc: "The website shows real modules and workflows, not vague claims." },
      { title: "Traceable operation", desc: "Relevant actions keep context and auditability." },
    ],
    painTitle: "What usually breaks without a central panel",
    painBody:
      "When a club depends on scattered messages, staff memory and manual routines, issues multiply.",
    pains: [
      "Inventory without context and alerts arriving too late.",
      "Cash and contributions reviewed slowly or inconsistently.",
      "Dispensing without clear traceability by member or collaborator.",
      "Shift changes with missing information.",
    ],
    outcomesTitle: "What changes when the product is properly implemented",
    outcomes: [
      "More operational clarity from the dashboard.",
      "Fewer mistakes in cash, stock and follow-up.",
      "Better control of access and permissions.",
      "More visibility for managers and owners.",
    ],
    productTitle: "Show the product with context, not just promises",
    productBody:
      "From the landing page, prospects should understand there are actual workflows, security controls and operational modules ready to use.",
    spotlightTitle: "Views that help sell the platform",
    spotlightCards: [
      { title: "Controlled dispensing", desc: "Weight, validations and completion flow with less room for error." },
      { title: "Coordinated team", desc: "Internal chat, alerts and operating context in one workspace." },
      { title: "Managers with visibility", desc: "KPIs, activity and alerts to decide faster." },
    ],
    securityTitle: "Security that makes sense to buyers",
    securityBody:
      "You do not need abstract jargon to build trust. You need clear controls, isolation and traceability.",
    plansTitle: "Clear plans for a simpler sales conversation",
    plansBody:
      "Contracting is manual and guided. Plans help frame scope, capacity and growth rhythm.",
    contactTitle: "Commercial and operational assessment with QuickAgence",
    contactBody:
      "The clearer the club's operating context, the better the team can prepare a useful demo and a realistic proposal.",
    contactPanelTitle: "Before the demo",
    contactPanelItems: [
      "We review the request manually.",
      "We confirm needs, plan and capacity.",
      "We coordinate setup, manual payment and activation.",
    ],
    contactPanelFoot:
      "The main contact channel is contact@quickagence.com. Each request is reviewed before proposing a demo, activation or recommended plan.",
    formTitle: "Request access or a demo",
    formSubtitle: "The form starts a commercial review and helps prepare a proposal that fits the club's day-to-day operation.",
    formHints: ["Commercial demo", "Software change", "Cash and inventory order"],
    faqLead: "Common questions before starting a commercial and operational evaluation.",
    footerNote: "QuickPanel360 by QuickAgence. Operations, security and traceability in one platform.",
    legalPrivacy: "Privacy",
    legalTerms: "Terms",
    legalCookies: "Cookies",
    cookieTitle: "Your privacy matters here too",
    cookieBody:
      "We use technical storage for language, consent and essential experience. You can accept all or set your preferences.",
    cookieNecessary: "Necessary",
    cookieAnalytics: "Analytics",
    cookieMarketing: "Marketing",
    cookieAcceptAll: "Accept all",
    cookieEssential: "Necessary only",
    cookieManage: "Manage",
    cookieSave: "Save preferences",
    cookieLocalControl: "Local control",
    cookieLocalNote:
      "These settings are stored in the current browser and can be updated at any time from the landing page footer.",
    cookieNecessaryDesc: "Always enabled for language, legal dialogs and essential experience.",
    cookieAnalyticsDesc: "Reserved for basic measurement when enabled on this website.",
    cookieMarketingDesc: "Reserved for future commercial actions. Not enabled by default.",
    closeLabel: "Close",
    legalModalPrivacyTitle: "Privacy Policy",
    legalModalTermsTitle: "Terms and Conditions",
  },
  nl: {
    announcement: "Handmatige onboarding, prive toegang en begeleide activatie door QuickAgence",
    announcementCta: "Demo aanvragen",
    heroBadge: "Operationele software voor priveclubs",
    heroTitle: "Verkoop een beter georganiseerde, veilige en professionele operatie vanaf dag een.",
    heroBody:
      "QuickPanel360 centraliseert dispensatie, kassa, leden, inventaris, beveiliging en teamoverzicht in een enkel paneel. Minder frictie en meer controle voor het team.",
    heroPrimary: "Demo aanvragen",
    heroSecondary: "Product bekijken",
    heroPoints: ["Begeleide activatie", "Handmatige facturatie", "Menselijke ondersteuning"],
    professionalBadges: [
      "Begeleide onboarding",
      "Prive omgeving per bedrijf",
      "Handmatige facturatie en activatie",
      "Menselijke commerciele beoordeling",
    ],
    trustTitle: "Gebouwd voor echte operaties, niet alleen voor mooie mockups",
    trustBody:
      "Het platform is ontworpen voor teams die tijdens de werkdag snel moeten registreren, controleren, afstemmen en reageren.",
    trustCards: [
      { title: "Begeleide activatie", desc: "Elke aanvraag wordt beoordeeld en de omgeving wordt samen met jou ingericht." },
      { title: "Zichtbaar product", desc: "De website toont echte modules en workflows, geen vage marketingclaims." },
      { title: "Traceerbare operatie", desc: "Belangrijke acties blijven voorzien van context en audit." },
    ],
    painTitle: "Wat meestal misgaat zonder centraal paneel",
    painBody:
      "Wanneer een club afhankelijk is van losse berichten, geheugen van medewerkers en handmatige routines, stapelen problemen zich op.",
    pains: [
      "Inventaris zonder context en meldingen die te laat komen.",
      "Kassa en bijdragen die traag of inconsistent worden gecontroleerd.",
      "Dispensatie zonder duidelijke traceerbaarheid per lid of medewerker.",
      "Shiftoverdrachten waarbij informatie verloren gaat.",
    ],
    outcomesTitle: "Wat verandert bij een goede implementatie",
    outcomes: [
      "Meer operationele duidelijkheid vanuit het dashboard.",
      "Minder fouten in kassa, voorraad en opvolging.",
      "Betere controle op toegang en rechten.",
      "Meer zichtbaarheid voor verantwoordelijken.",
    ],
    productTitle: "Laat het product zien met context, niet alleen met beloftes",
    productBody:
      "Vanaf de landing moet een prospect begrijpen dat er echte workflows, beveiliging en operationele modules klaarstaan om te gebruiken.",
    spotlightTitle: "Weergaven die helpen om het platform te verkopen",
    spotlightCards: [
      { title: "Gecontroleerde dispensatie", desc: "Gewicht, validaties en afronding met minder foutmarge." },
      { title: "Gecoordineerd team", desc: "Interne chat, meldingen en operationele context in een werkruimte." },
      { title: "Zicht voor managers", desc: "KPIs, activiteit en meldingen om sneller beslissingen te nemen." },
    ],
    securityTitle: "Beveiliging die begrijpelijk vertrouwen geeft",
    securityBody:
      "Je hebt geen abstract jargon nodig om vertrouwen op te bouwen. Je hebt duidelijke controles, isolatie en traceerbaarheid nodig.",
    plansTitle: "Duidelijke plannen voor een eenvoudiger verkoopgesprek",
    plansBody:
      "Contractering is handmatig en begeleid. Plannen helpen om scope, capaciteit en groeiritme te kaderen.",
    contactTitle: "Praat met QuickAgence en wij helpen de fit beoordelen",
    contactBody:
      "Hoe duidelijker de operationele context van de club, hoe beter een nuttige demo en een passend voorstel kunnen worden voorbereid.",
    contactPanelTitle: "Voor de demo",
    contactPanelItems: [
      "We beoordelen de aanvraag handmatig.",
      "We bevestigen behoeften, plan en capaciteit.",
      "We coordineren setup, handmatige betaling en activatie.",
    ],
    contactPanelFoot:
      "Het belangrijkste contactkanaal is contact@quickagence.com. Elke aanvraag wordt beoordeeld voordat een demo, activatie of aanbevolen plan wordt voorgesteld.",
    formTitle: "Toegang of demo aanvragen",
    formSubtitle: "Met dit formulier start een commerciele beoordeling en kan een voorstel worden voorbereid dat past bij de dagelijkse werking van de club.",
    formHints: ["Ik wil een commerciële demo", "Ik beoordeel een softwarewissel", "Ik moet kassa en inventaris ordenen"],
    faqLead: "Gebruikelijke vragen voordat een commerciele en operationele evaluatie start.",
    footerNote: "QuickPanel360 by QuickAgence. Operatie, beveiliging en traceerbaarheid in een platform.",
    legalPrivacy: "Privacy",
    legalTerms: "Voorwaarden",
    legalCookies: "Cookies",
    cookieTitle: "Ook hier telt je privacy",
    cookieBody:
      "We gebruiken technische opslag voor taal, toestemming en essentiële ervaring. Je kunt alles accepteren of voorkeuren instellen.",
    cookieNecessary: "Noodzakelijk",
    cookieAnalytics: "Analyse",
    cookieMarketing: "Marketing",
    cookieAcceptAll: "Alles accepteren",
    cookieEssential: "Alleen noodzakelijk",
    cookieManage: "Instellen",
    cookieSave: "Voorkeuren bewaren",
    cookieLocalControl: "Lokale controle",
    cookieLocalNote:
      "Deze instellingen worden in deze browser opgeslagen en kunnen altijd via de footer van de landingspagina worden aangepast.",
    cookieNecessaryDesc: "Altijd actief voor taal, juridische dialogen en essentiele ervaring.",
    cookieAnalyticsDesc: "Gereserveerd voor basisanalyse wanneer dit op deze website wordt ingeschakeld.",
    cookieMarketingDesc: "Gereserveerd voor toekomstige commerciele acties. Niet standaard actief.",
    closeLabel: "Sluiten",
    legalModalPrivacyTitle: "Privacybeleid",
    legalModalTermsTitle: "Voorwaarden",
  },
} as const;

function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.es;
}

function getCopy(locale: Locale) {
  return landingCopy[locale] ?? landingCopy.es;
}

function useActiveSection() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-38% 0px -52% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return active;
}

function useScrollAnimation(refreshKey = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" },
    );

    root.querySelectorAll(".animate-on-scroll").forEach((node) => {
      if (!node.classList.contains("is-visible")) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [refreshKey]);

  return ref;
}

function StatCounter({
  value,
  suffix,
  label,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  return (
    <div className="rounded-2xl border border-[#E0DDD4] bg-white px-4 py-5 text-left shadow-sm shadow-[#15140F]/4">
      <p className="text-2xl font-bold text-[#15140F] sm:text-3xl">
        <span>{decimals ? value.toFixed(decimals) : Math.round(value)}</span>
        <span className="text-base sm:text-lg">{suffix}</span>
      </p>
      <p className="mt-1 text-xs text-[#7A7770] sm:text-sm">{label}</p>
    </div>
  );
}

export function LandingPage({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = useMemo(() => getMessages(locale), [locale]);
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [langOpen, setLangOpen] = useState(false);
  const [mobNav, setMobNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [legalOpen, setLegalOpen] = useState<"privacy" | "terms" | null>(null);
  const [cookiePrefsOpen, setCookiePrefsOpen] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [cookiePreferences, setCookiePreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const activeSection = useActiveSection();
  const scrollRef = useScrollAnimation(plans.length);

  useEffect(() => {
    fetch(`${API}/public/marketing/plans`)
      .then((response) => response.json())
      .then(setPlans)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!raw) {
        setShowCookieBanner(true);
        return;
      }

      const parsed = JSON.parse(raw);
      setCookiePreferences({
        necessary: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
      });
      setShowCookieBanner(false);
    } catch {
      setShowCookieBanner(true);
    }
  }, []);

  function saveCookiePreferences(next: { necessary: true; analytics: boolean; marketing: boolean }) {
    window.localStorage.setItem(
      COOKIE_STORAGE_KEY,
      JSON.stringify({ ...next, updatedAt: new Date().toISOString() }),
    );
    setCookiePreferences(next);
    setShowCookieBanner(false);
    setCookiePrefsOpen(false);
  }

  function acceptAllCookies() {
    saveCookiePreferences({ necessary: true, analytics: true, marketing: true });
  }

  function acceptEssentialCookies() {
    saveCookiePreferences({ necessary: true, analytics: false, marketing: false });
  }

  const navLink = useCallback(
    (href: string, label: string) => {
      const id = href.replace("#", "");
      const active = activeSection === id;
      return (
        <a
          key={href}
          href={href}
          className={`relative py-1 text-sm transition-colors ${
            active ? "font-semibold text-[#15140F]" : "text-[#5A5850] hover:text-[#15140F]"
          }`}
        >
          {label}
          {active ? (
            <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-[#15140F] animate-nav-indicator" />
          ) : null}
        </a>
      );
    },
    [activeSection],
  );

  const highlightedPlan = plans.find((plan) => plan.isRecommended) ?? plans[0] ?? null;

  return (
    <div ref={scrollRef} className="min-h-screen scroll-smooth bg-[#FAF8F2] text-[#15140F]">
      <div className="border-b border-[#E0DDD4] bg-[#FFF6BF]">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-2 text-[11px] font-medium text-[#15140F] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-xs">
          <p>{copy.announcement}</p>
          <a href="#contact" className="inline-flex items-center gap-1 font-semibold hover:opacity-80">
            {copy.announcementCta}
            <ArrowRight size={12} />
          </a>
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-[#E0DDD4]/70 bg-[#FAF8F2]/90 shadow-sm backdrop-blur-xl"
            : "border-b border-[#E0DDD4] bg-[#FAF8F2]/95 backdrop-blur-lg"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <BrandMark variant="badge" size={32} className="h-9 w-9 rounded-xl" />
            <div>
              <span className="block text-base font-bold text-[#15140F] sm:text-lg">{branding.appName}</span>
              <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[#7A7770] sm:block">
                by {branding.companyName}
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLink("#product", t.nav.features)}
            {navLink("#advantages", t.nav.advantages)}
            {navLink("#pricing", t.nav.pricing)}
            {navLink("#faq", t.nav.faq)}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen((current) => !current)}
                className="flex items-center gap-1 text-sm text-[#5A5850]"
                type="button"
              >
                <Globe size={15} />
                {localeLabels[locale]}
              </button>
              {langOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-[#E0DDD4] bg-white py-1 shadow-lg shadow-[#15140F]/8">
                  {locales.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setLangOpen(false);
                        router.push(`/${item}`);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm ${
                        item === locale
                          ? "bg-[#FFF6BF] font-semibold text-[#15140F]"
                          : "text-[#5A5850] hover:bg-[#F2EFE6]"
                      }`}
                    >
                      {localeLabels[item]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Link href="/login" className="hidden text-sm font-medium text-[#5A5850] hover:text-[#15140F] md:inline">
              {t.nav.login}
            </Link>

            <a
              href="#contact"
              className="rounded-lg bg-[#15140F] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#2A2820] sm:px-4 sm:text-sm"
            >
              {t.nav.requestAccess}
            </a>

            <button
              type="button"
              onClick={() => setMobNav((current) => !current)}
              className="rounded-lg p-2 text-[#5A5850] md:hidden"
              aria-label="Abrir menu"
            >
              {mobNav ? <X size={18} /> : <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h14M3 10h14M3 14h14" /></svg>}
            </button>
          </div>
        </div>

        {mobNav ? (
          <div className="border-t border-[#E0DDD4] bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3 text-sm font-medium text-[#5A5850]">
              <a href="#product" onClick={() => setMobNav(false)}>{t.nav.features}</a>
              <a href="#advantages" onClick={() => setMobNav(false)}>{t.nav.advantages}</a>
              <a href="#pricing" onClick={() => setMobNav(false)}>{t.nav.pricing}</a>
              <a href="#faq" onClick={() => setMobNav(false)}>{t.nav.faq}</a>
              <a href="#contact" onClick={() => setMobNav(false)}>{t.nav.contact}</a>
            </nav>
          </div>
        ) : null}
      </header>

      <section className="relative overflow-hidden px-4 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-[#FFE600]/16 blur-3xl" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#FFF6BF] blur-3xl" />
          <div className="absolute bottom-10 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="text-center lg:text-left">
            <div className="animate-on-scroll inline-flex items-center gap-2 rounded-full border border-[#E0DDD4] bg-white px-4 py-2 text-xs font-medium text-[#15140F] shadow-sm shadow-[#15140F]/5">
              <Sparkles size={12} className="text-[#15140F]" />
              {copy.heroBadge}
            </div>

            <h1 className="animate-on-scroll mx-auto mt-6 max-w-[12.5ch] text-[2.55rem] font-bold leading-[1] text-[#15140F] sm:max-w-4xl sm:text-5xl lg:mx-0 xl:text-7xl">
              {copy.heroTitle}
            </h1>

            <p className="animate-on-scroll mx-auto mt-5 max-w-2xl text-[15px] leading-8 text-[#5A5850] sm:text-lg lg:mx-0">
              {copy.heroBody}
            </p>

            <div className="animate-on-scroll mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#15140F] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#15140F]/12 transition hover:-translate-y-0.5 hover:bg-[#2A2820] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2"
              >
                {copy.heroPrimary}
                <ArrowRight size={15} />
              </a>
              <a
                href="#product"
                className="inline-flex items-center justify-center rounded-xl border border-[#E0DDD4] bg-white px-6 py-3.5 text-sm font-semibold text-[#15140F] transition hover:border-[#15140F] hover:bg-[#FFFDFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2"
              >
                {copy.heroSecondary}
              </a>
            </div>

            <div className="animate-on-scroll mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-[#7A7770] lg:justify-start">
              {copy.heroPoints.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <Check size={12} className="text-[#15140F]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-on-scroll">
            <div className="relative rounded-[28px] border border-[#E0DDD4] bg-white/75 p-4 shadow-2xl shadow-[#15140F]/8 backdrop-blur-sm">
              <div className="absolute right-6 top-6 rounded-full border border-[#E0DDD4] bg-white px-3 py-1.5 text-xs font-medium text-[#15140F] shadow-sm">
                Activo ahora
              </div>
              <div className="absolute bottom-4 left-4 rounded-full border border-[#E0DDD4] bg-[#FAF8F2] px-3 py-1.5 text-xs font-medium text-[#15140F] shadow-sm">
                Cifrado 256 bit
              </div>
              <HeroIllustration className="h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E0DDD4] bg-white px-4 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="animate-on-scroll">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">{copy.trustTitle}</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#5A5850] sm:text-base">
              {copy.trustBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {copy.professionalBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-2 rounded-full border border-[#E0DDD4] bg-[#FFFDFC] px-3 py-1.5 text-xs font-medium text-[#15140F]"
                >
                  <ShieldCheck size={12} className="text-[#15140F]" />
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="animate-on-scroll grid gap-4 sm:grid-cols-3">
            <StatCounter value={12} suffix="+" label={t.stats.modules} />
            <StatCounter value={256} suffix=" bit" label={t.stats.encryption} />
            <StatCounter value={99.9} suffix="%" label={t.stats.uptime} decimals={1} />
          </div>
        </div>
      </section>

      <section id="product" className="px-4 py-18 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="animate-on-scroll mx-auto mb-8 max-w-3xl text-center sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">Producto</p>
            <h2 className="mt-3 text-[1.95rem] font-bold leading-[1.08] text-[#15140F] sm:text-4xl">
              Flujos reales, modulos claros y control visible desde el primer vistazo
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5A5850]">
              La landing presenta el producto con pantallas, casos de uso y modulos concretos para que la propuesta se entienda rapido y con contexto operativo.
            </p>
          </div>

          <div className="animate-on-scroll">
            <ModuleShowcase t={t} />
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {copy.spotlightCards.map((card) => (
              <div
                key={card.title}
                className="animate-on-scroll h-full rounded-2xl border border-[#E0DDD4] bg-white p-5 shadow-sm shadow-[#15140F]/4 sm:p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF6BF] text-[#15140F]">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#15140F]">{card.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5A5850]">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {productModules.map((key, index) => {
              const item = t.modules.items[key];
              const Icon = icons[key] ?? Package;
              return (
                <div
                  key={key}
                  className={`animate-on-scroll stagger-${(index % 4) + 1} flex h-full flex-col rounded-2xl border border-[#E0DDD4] bg-[#FFFDFC] p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#15140F]/5 sm:p-5`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF8F2] text-[#15140F]">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#15140F]">{item.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5A5850]">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="advantages" className="bg-[#F2EFE6] px-4 py-18 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div className="animate-on-scroll rounded-[28px] border border-[#E0DDD4] bg-white p-8 shadow-sm shadow-[#15140F]/4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">Problema</p>
            <h2 className="mt-3 text-[1.95rem] font-bold leading-[1.08] text-[#15140F] sm:text-4xl">{copy.painTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-[#5A5850] sm:text-base">{copy.painBody}</p>
            <div className="mt-6 space-y-3">
              {copy.pains.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#FAF8F2] px-4 py-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#15140F]" />
                  <p className="text-sm leading-6 text-[#4A4840]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-on-scroll rounded-[28px] border border-[#E0DDD4] bg-[#15140F] p-8 text-white shadow-xl shadow-[#15140F]/12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFE600]">Resultado</p>
            <h2 className="mt-3 text-[1.95rem] font-bold leading-[1.08] sm:text-4xl">{copy.outcomesTitle}</h2>
            <div className="mt-6 space-y-4">
              {copy.outcomes.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-[#2A2820] bg-[#1E1C16] px-4 py-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#FFE600]" />
                  <p className="text-sm leading-6 text-[#D9D4C7]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#15140F] px-4 py-18 text-white sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="animate-on-scroll max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFE600]">Seguridad</p>
            <h2 className="mt-3 text-[1.95rem] font-bold leading-[1.08] sm:text-4xl">{copy.securityTitle}</h2>
            <p className="mt-4 text-base leading-7 text-[#D9D4C7]">{copy.securityBody}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.security.items.map((item, index) => (
              <div
                key={item}
                className={`animate-on-scroll stagger-${(index % 3) + 1} rounded-2xl border border-[#2A2820] bg-[#1E1C16] p-5`}
              >
                <Lock size={16} className="text-[#FFE600]" />
                <p className="mt-4 text-sm leading-7 text-[#F2EFE6]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-18 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="animate-on-scroll mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">Planes</p>
            <h2 className="mt-3 text-[1.95rem] font-bold leading-[1.08] text-[#15140F] sm:text-4xl">{copy.plansTitle}</h2>
            <p className="mt-4 text-base leading-7 text-[#5A5850]">{copy.plansBody}</p>
          </div>

          {highlightedPlan ? (
            <div className="animate-on-scroll mt-8 rounded-[28px] border border-[#E0DDD4] bg-[#FFFDFC] p-6 shadow-sm shadow-[#15140F]/4">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-[#FFF6BF] px-3 py-1 text-xs font-semibold text-[#15140F]">
                    {highlightedPlan.offerLabel || t.pricing.recommended}
                  </span>
                  <h3 className="mt-4 text-2xl font-bold text-[#15140F]">
                    {highlightedPlan.marketingTitle || highlightedPlan.name}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5A5850]">
                    {highlightedPlan.marketingDescription || highlightedPlan.description}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-5 py-4 shadow-sm shadow-[#15140F]/5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7A7770]">Desde</p>
                  <p className="mt-1 text-3xl font-bold text-[#15140F]">
                    {highlightedPlan.priceMonthly.toFixed(2)} CR
                    <span className="ml-1 text-sm font-medium text-[#7A7770]">{t.pricing.monthly}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`animate-on-scroll stagger-${(index % 3) + 1} relative flex h-full flex-col rounded-[28px] border p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#15140F]/6 ${
                  plan.isRecommended
                    ? "border-[#15140F] bg-[#FFF6BF]/55"
                    : "border-[#E0DDD4] bg-white"
                }`}
              >
                {plan.isRecommended ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#15140F] px-3 py-1 text-xs font-semibold text-white">
                    {t.pricing.recommended}
                  </span>
                ) : null}
                <h3 className="text-xl font-bold text-[#15140F]">{plan.marketingTitle || plan.name}</h3>
                <p className="mt-2 text-sm leading-7 text-[#5A5850]">
                  {plan.marketingDescription || plan.description}
                </p>
                <div className="mt-5 border-t border-[#E0DDD4] pt-5">
                  <p className="text-3xl font-bold text-[#15140F]">
                    {plan.priceMonthly.toFixed(2)} CR
                    <span className="ml-1 text-sm font-medium text-[#7A7770]">{t.pricing.monthly}</span>
                  </p>
                </div>
                <div className="mt-5 space-y-2 text-sm text-[#4A4840]">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#15140F]" />
                    {plan.maxUsers ? `${plan.maxUsers} ${t.pricing.usersLimit}` : t.pricing.noLimit}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#15140F]" />
                    {plan.maxProducts ? `${plan.maxProducts} ${t.pricing.productsLimit}` : t.pricing.noLimit}
                  </div>
                </div>
                {plan.modules.length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {plan.modules.slice(0, 6).map((module) => (
                      <span
                        key={module.id}
                        className="rounded-full bg-[#FAF8F2] px-3 py-1 text-[11px] font-medium text-[#5A5850]"
                      >
                        {module.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <a
                  href="#contact"
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2 ${
                    plan.isRecommended
                      ? "bg-[#15140F] text-white hover:bg-[#2A2820]"
                      : "border border-[#E0DDD4] text-[#15140F] hover:bg-[#FAF8F2]"
                  }`}
                >
                  {plan.ctaLabel || t.pricing.requestPlan}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-[#F2EFE6] px-4 py-18 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="animate-on-scroll">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">Contacto</p>
            <h2 className="mt-3 text-[1.95rem] font-bold leading-[1.08] text-[#15140F] sm:text-4xl">{copy.contactTitle}</h2>
            <p className="mt-4 text-base leading-7 text-[#5A5850]">{copy.contactBody}</p>

            <div className="mt-6 rounded-[28px] border border-[#E0DDD4] bg-white p-6 shadow-sm shadow-[#15140F]/4">
              <h3 className="text-lg font-semibold text-[#15140F]">{copy.contactPanelTitle}</h3>
              <div className="mt-4 space-y-3">
                {copy.contactPanelItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#FAF8F2] px-4 py-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#15140F]" />
                    <p className="text-sm leading-6 text-[#4A4840]">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E0DDD4] p-4">
                  <Mail size={16} className="text-[#15140F]" />
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7A7770]">Email</p>
                  <p className="mt-1 text-sm font-medium text-[#15140F]">{branding.contactEmail}</p>
                </div>
                <div className="rounded-2xl border border-[#E0DDD4] p-4">
                  <PhoneCall size={16} className="text-[#15140F]" />
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7A7770]">Respuesta</p>
                  <p className="mt-1 text-sm font-medium text-[#15140F]">Manual y personalizada</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-[#5A5850]">{copy.contactPanelFoot}</p>
            </div>
          </div>

          <div className="animate-on-scroll rounded-[28px] border border-[#E0DDD4] bg-white p-6 shadow-lg shadow-[#15140F]/6 sm:p-8">
            <h3 className="text-[1.65rem] font-bold leading-[1.1] text-[#15140F] sm:text-2xl">{copy.formTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-[#5A5850]">{copy.formSubtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {copy.formHints.map((hint) => (
                <span key={hint} className="rounded-full bg-[#FAF8F2] px-3 py-1.5 text-xs font-medium text-[#5A5850]">
                  {hint}
                </span>
              ))}
            </div>
            <Form t={t} plans={plans} locale={locale} />
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 py-18 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="animate-on-scroll text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">FAQ</p>
            <h2 className="mt-3 text-[1.95rem] font-bold leading-[1.08] text-[#15140F] sm:text-4xl">{t.faq.title}</h2>
            <p className="mt-4 text-base leading-7 text-[#5A5850]">{copy.faqLead}</p>
          </div>

          <div className="mt-10 space-y-3">
            {t.faq.items.map((item, index) => (
              <Faq key={item.q} q={item.q} a={item.a} index={index} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E0DDD4] bg-[#F2EFE6] px-4 py-18 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark variant="badge" size={36} className="h-10 w-10 rounded-xl" />
              <div>
                <p className="text-lg font-bold text-[#15140F]">{branding.appName}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A7770]">by {branding.companyName}</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#5A5850]">{copy.footerNote}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">{t.footer.legal}</h4>
            <div className="mt-4 space-y-3">
              <button type="button" onClick={() => setLegalOpen("privacy")} className="block text-sm text-[#5A5850] transition hover:text-[#15140F]">
                {copy.legalPrivacy}
              </button>
              <button type="button" onClick={() => setLegalOpen("terms")} className="block text-sm text-[#5A5850] transition hover:text-[#15140F]">
                {copy.legalTerms}
              </button>
              <button type="button" onClick={() => setCookiePrefsOpen(true)} className="block text-sm text-[#5A5850] transition hover:text-[#15140F]">
                {copy.legalCookies}
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">{t.footer.contact}</h4>
            <p className="mt-4 text-sm text-[#5A5850]">{branding.contactEmail}</p>
            <p className="mt-2 text-sm text-[#5A5850]">{branding.poweredBy}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">{t.footer.languages}</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {locales.map((item) => (
                <Link
                  key={item}
                  href={`/${item}`}
                className={`rounded-lg px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F2EFE6] ${
                    item === locale
                      ? "bg-[#FFF6BF] font-semibold text-[#15140F]"
                      : "text-[#7A7770] hover:bg-white hover:text-[#15140F]"
                  }`}
                >
                  {localeLabels[item]}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-[#E0DDD4] pt-8 sm:flex-row">
          <p className="text-xs text-[#7A7770]">{t.footer.rights}</p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group inline-flex items-center gap-2 rounded-lg border border-[#E0DDD4] bg-white px-3 py-2 text-xs text-[#7A7770] transition hover:border-[#15140F] hover:text-[#15140F] hover:shadow-sm"
          >
            <ArrowUp size={13} className="transition-transform group-hover:-translate-y-0.5" />
            {locale === "en" ? "Back to top" : locale === "nl" ? "Terug naar boven" : "Volver arriba"}
          </button>
        </div>
      </footer>

      <LegalDocumentDialog
        open={legalOpen}
        onOpenChange={(next) => {
          if (!next) setLegalOpen(null);
        }}
        locale={locale}
      />

      <CookiePreferencesDialog
        open={cookiePrefsOpen}
        onOpenChange={setCookiePrefsOpen}
        copy={copy}
        preferences={cookiePreferences}
        onChange={setCookiePreferences}
        onSave={() =>
          saveCookiePreferences({
            necessary: true,
            analytics: cookiePreferences.analytics,
            marketing: cookiePreferences.marketing,
          })
        }
      />

      {showCookieBanner ? (
        <CookieBanner
          copy={copy}
          onAcceptAll={acceptAllCookies}
          onAcceptEssential={acceptEssentialCookies}
          onManage={() => setCookiePrefsOpen(true)}
        />
      ) : null}
    </div>
  );
}

const showcaseTabIds = ["chat", "pos", "dashboard", "security"] as const;
type ShowcaseTabId = (typeof showcaseTabIds)[number];

const previewComponents: Record<ShowcaseTabId, React.ComponentType> = {
  chat: ChatPreview,
  pos: PosPreview,
  dashboard: DashboardPreview,
  security: SecurityPreview,
};

function ModuleShowcase({ t }: { t: Messages }) {
  const [active, setActive] = useState<ShowcaseTabId>("chat");
  const showcase = t.showcase[active];
  const Preview = previewComponents[active];

  return (
    <div className="rounded-[28px] border border-[#E0DDD4] bg-white p-5 shadow-lg shadow-[#15140F]/6 lg:p-6">
      <div className="flex flex-wrap gap-2">
        {showcaseTabIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
              active === id
                ? "bg-[#15140F] text-white shadow-md shadow-[#15140F]/10"
                : "bg-[#F2EFE6] text-[#5A5850] hover:bg-[#E0DDD4]"
            }`}
            aria-pressed={active === id}
          >
            {t.showcase.tabs[id]}
          </button>
        ))}
      </div>

      <div key={active} className="showcase-content mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A7770]">Caso de uso</p>
          <h3 className="mt-3 text-2xl font-bold text-[#15140F]">{showcase.title}</h3>
          <ul className="mt-5 space-y-3">
            {showcase.points.map((point) => (
              <li key={point} className="flex items-start gap-3 rounded-2xl bg-[#FAF8F2] px-4 py-3">
                <div className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#FFF6BF] text-[#15140F]">
                  <Check size={12} />
                </div>
                <span className="text-sm leading-6 text-[#4A4840]">{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2 lg:mt-0">
          <Preview />
        </div>
      </div>
    </div>
  );
}

function Form({
  t,
  plans,
  locale,
}: {
  t: Messages;
  plans: Plan[];
  locale: Locale;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    country: "ES",
    preferredLanguage: locale,
    requestedPlanId: "",
    estimatedUsers: "",
    message: "",
    consentGiven: false,
    website: "",
  });
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const placeholders = {
    es: {
      name: "Nombre y cargo de contacto",
      email: "nombre@club.com",
      phone: "+34 600 000 000",
      company: "Nombre del club o empresa",
      country: "ES",
      users: "Ej. 6",
      message: "Describe brevemente el volumen del club, modulos prioritarios o necesidades de implantacion.",
      helper: "Cuanta mas informacion operativa se comparta, mejor podremos preparar la demo y orientar el plan.",
      manualReview: "La revision de solicitudes, la activacion y la definicion del plan se realizan manualmente para asegurar una configuracion coherente con la operativa del club.",
    },
    en: {
      name: "Contact name and role",
      email: "name@club.com",
      phone: "+44 7000 000000",
      company: "Club or company name",
      country: "UK",
      users: "E.g. 6",
      message: "Briefly describe club size, priority modules or rollout needs.",
      helper: "The more operational context you share, the better the team can prepare the demo and recommend the right plan.",
      manualReview: "Request review, activation and plan definition are handled manually to keep the setup aligned with the club's operating reality.",
    },
    nl: {
      name: "Naam en rol van contactpersoon",
      email: "naam@club.com",
      phone: "+31 6 12345678",
      company: "Naam van club of bedrijf",
      country: "NL",
      users: "Bijv. 6",
      message: "Beschrijf kort de omvang van de club, prioritaire modules of implementatiebehoeften.",
      helper: "Hoe meer operationele context wordt gedeeld, hoe beter de demo en het aanbevolen plan kunnen worden voorbereid.",
      manualReview: "Aanvraagbeoordeling, activatie en planbepaling gebeuren handmatig om de configuratie goed te laten aansluiten op de werking van de club.",
    },
  }[locale];

  function update(key: string, value: unknown) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.website) return;

    setState("loading");

    try {
      const { website, consentGiven, ...rest } = form;
      void website;
      void consentGiven;

      const response = await fetch(`${API}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          estimatedUsers: rest.estimatedUsers ? parseInt(rest.estimatedUsers, 10) : undefined,
          requestedPlanId: rest.requestedPlanId || undefined,
        }),
      });

      if (!response.ok) throw new Error("lead_request_failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="mt-8 rounded-[28px] border border-[#E0DDD4] bg-[#FFF6BF] p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto text-[#15140F]" />
        <p className="mt-4 text-lg font-semibold text-[#15140F]">{t.form.success}</p>
      </div>
    );
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-xl border border-[#E0DDD4] bg-[#FFFDFC] px-4 text-sm text-[#15140F] outline-none transition focus:border-[#15140F] focus:ring-2 focus:ring-[#FFE600]/30";

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      <div className="rounded-2xl border border-[#E0DDD4] bg-[#FAF8F2] px-4 py-4 text-sm leading-6 text-[#5A5850]">
        {placeholders.helper}
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden opacity-0">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => update("website", event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.name} *</span>
          <input required placeholder={placeholders.name} className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.email} *</span>
          <input required type="email" placeholder={placeholders.email} className={inputClass} value={form.email} onChange={(event) => update("email", event.target.value)} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.phone}</span>
          <input placeholder={placeholders.phone} className={inputClass} value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.company} *</span>
          <input required placeholder={placeholders.company} className={inputClass} value={form.companyName} onChange={(event) => update("companyName", event.target.value)} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.country}</span>
          <input placeholder={placeholders.country} className={inputClass} value={form.country} onChange={(event) => update("country", event.target.value)} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.language}</span>
          <select className={inputClass} value={form.preferredLanguage} onChange={(event) => update("preferredLanguage", event.target.value)}>
            {locales.map((item) => (
              <option key={item} value={item}>
                {localeLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1.2fr_0.8fr]">
        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.plan}</span>
          <select className={inputClass} value={form.requestedPlanId} onChange={(event) => update("requestedPlanId", event.target.value)}>
            <option value="">{t.form.selectPlan}</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - {plan.priceMonthly.toFixed(2)} CR/mes
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#4A4840]">{t.form.users}</span>
          <input
            type="number"
            min="1"
            placeholder={placeholders.users}
            className={inputClass}
            value={form.estimatedUsers}
            onChange={(event) => update("estimatedUsers", event.target.value)}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-[#E0DDD4] bg-[#FAF8F2] px-4 py-4 text-sm leading-6 text-[#5A5850]">
        {placeholders.manualReview}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-[#4A4840]">{t.form.message}</span>
        <textarea
          rows={5}
          placeholder={placeholders.message}
          className="mt-2 w-full rounded-2xl border border-[#E0DDD4] bg-[#FFFDFC] px-4 py-3 text-sm text-[#15140F] outline-none transition focus:border-[#15140F] focus:ring-2 focus:ring-[#FFE600]/30"
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
        />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-[#E0DDD4] bg-[#FAF8F2] px-4 py-4 text-sm text-[#4A4840]">
        <input
          type="checkbox"
          required
          className="mt-1 h-4 w-4 accent-[#15140F]"
          checked={form.consentGiven}
          onChange={(event) => update("consentGiven", event.target.checked)}
        />
        <span>{t.form.consent}</span>
      </label>

      {state === "error" ? <p className="text-sm text-red-700">{t.form.error}</p> : null}

      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#15140F] px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-[#15140F]/12 transition hover:-translate-y-0.5 hover:bg-[#2A2820] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {state === "loading" ? t.form.submitting : t.form.submit}
        {state !== "loading" ? <ArrowRight size={16} /> : null}
      </button>
    </form>
  );
}

function Faq({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`animate-on-scroll stagger-${(index % 4) + 1} overflow-hidden rounded-2xl border bg-white transition ${
        open ? "border-[#15140F] shadow-md shadow-[#15140F]/5" : "border-[#E0DDD4]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#FFFDFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-inset"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[#15140F]">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#7A7770] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border-t border-[#F2EFE6] px-5 py-4">
            <p className="text-sm leading-7 text-[#5A5850]">{a}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegalDocumentDialog({
  open,
  onOpenChange,
  locale,
}: {
  open: "privacy" | "terms" | null;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
}) {
  const copy = getCopy(locale);
  const isPrivacy = open === "privacy";

  return (
    <Dialog open={Boolean(open)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden rounded-[24px] border border-[#E0DDD4] bg-[#FAF8F2] p-0 shadow-2xl shadow-[#15140F]/12 sm:w-full sm:rounded-[30px]">
        <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-[#E0DDD4] bg-[#FAF8F2]/95 px-6 py-5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 pr-8">
            <span className="inline-flex items-center rounded-full border border-[#E0DDD4] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A7770]">
              Legal
            </span>
            <DialogDescription className="text-xs text-[#7A7770]">
              Ultima actualizacion: {legalLastUpdated}
            </DialogDescription>
          </div>
          <DialogTitle className="mt-3 text-2xl font-semibold text-[#15140F]">
            {isPrivacy ? copy.legalModalPrivacyTitle : copy.legalModalTermsTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-7 sm:py-7">
          <div className="min-w-0 rounded-[24px] border border-[#E0DDD4] bg-white px-4 py-4 shadow-sm shadow-[#15140F]/5 sm:px-7 sm:py-7">
            {isPrivacy ? <PrivacyDocument /> : <TermsDocument />}
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 shrink-0 border-t border-[#E0DDD4] bg-[#FAF8F2]/95 backdrop-blur">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CookiePreferencesDialog({
  open,
  onOpenChange,
  copy,
  preferences,
  onChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ReturnType<typeof getCopy>;
  preferences: { necessary: boolean; analytics: boolean; marketing: boolean };
  onChange: React.Dispatch<
    React.SetStateAction<{ necessary: boolean; analytics: boolean; marketing: boolean }>
  >;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[#E0DDD4] bg-[#FAF8F2] p-0 shadow-2xl shadow-[#15140F]/12 sm:w-full sm:rounded-[30px]">
        <DialogHeader className="shrink-0 border-b border-[#E0DDD4] bg-[#FAF8F2] px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#E0DDD4] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A7770]">
              Cookies
            </span>
            <span className="inline-flex items-center rounded-full bg-[#FFF6BF] px-3 py-1 text-[11px] font-medium text-[#15140F]">
              {copy.cookieLocalControl}
            </span>
          </div>
          <DialogTitle className="mt-3 text-2xl font-semibold text-[#15140F]">{copy.cookieTitle}</DialogTitle>
          <DialogDescription className="text-sm leading-7 text-[#5A5850]">{copy.cookieBody}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-7 sm:py-7">
          <div className="rounded-2xl border border-[#E0DDD4] bg-white px-4 py-4 text-sm leading-6 text-[#5A5850]">
            {copy.cookieLocalNote}
          </div>
          <CookiePreferenceRow
            label={copy.cookieNecessary}
            description={copy.cookieNecessaryDesc}
            checked
            disabled
            onCheckedChange={() => {}}
          />
          <CookiePreferenceRow
            label={copy.cookieAnalytics}
            description={copy.cookieAnalyticsDesc}
            checked={preferences.analytics}
            onCheckedChange={(checked) =>
              onChange((current) => ({ ...current, analytics: checked }))
            }
          />
          <CookiePreferenceRow
            label={copy.cookieMarketing}
            description={copy.cookieMarketingDesc}
            checked={preferences.marketing}
            onCheckedChange={(checked) =>
              onChange((current) => ({ ...current, marketing: checked }))
            }
          />
        </div>
        <DialogFooter className="sticky bottom-0 shrink-0 border-t border-[#E0DDD4] bg-[#FAF8F2]/95">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.closeLabel}
          </Button>
          <Button onClick={onSave}>{copy.cookieSave}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CookiePreferenceRow({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#E0DDD4] bg-white px-4 py-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#15140F]">{label}</p>
          {disabled ? (
            <span className="rounded-full bg-[#FFF6BF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#15140F]">
              Siempre activa
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-[#5A5850]">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          checked
            ? "border-[#15140F] bg-[#15140F]"
            : "border-[#D9D4C7] bg-[#F2EFE6]"
        } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <span
          className={`ml-1 inline-block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function CookieBanner({
  copy,
  onAcceptAll,
  onAcceptEssential,
  onManage,
}: {
  copy: ReturnType<typeof getCopy>;
  onAcceptAll: () => void;
  onAcceptEssential: () => void;
  onManage: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-5xl rounded-[28px] border border-[#E0DDD4] bg-white p-5 shadow-2xl shadow-[#15140F]/12 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[#15140F]">{copy.cookieTitle}</p>
          <p className="mt-2 text-sm leading-7 text-[#5A5850]">{copy.cookieBody}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onManage}
            className="rounded-xl border border-[#E0DDD4] px-4 py-3 text-sm font-semibold text-[#15140F] transition hover:bg-[#FAF8F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2"
          >
            {copy.cookieManage}
          </button>
          <button
            type="button"
            onClick={onAcceptEssential}
            className="rounded-xl border border-[#E0DDD4] px-4 py-3 text-sm font-semibold text-[#15140F] transition hover:bg-[#FAF8F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2"
          >
            {copy.cookieEssential}
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-xl bg-[#15140F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2A2820] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2"
          >
            {copy.cookieAcceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
