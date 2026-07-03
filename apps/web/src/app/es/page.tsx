import { LandingPage } from '@/components/marketing/landing-page';

export const metadata = {
  title: 'QuickPanel360 - Plataforma de gestion para clubes',
  description: 'Sistema SaaS privado para gestion integral de clubes. Dispensacion, inventario, caja, socios, analitica y mas.',
  openGraph: {
    title: 'QuickPanel360 - Plataforma de gestion para clubes',
    description: 'Control operativo, trazabilidad, dispensacion, inventario, caja, analitica y mas. Todo en un sistema privado por empresa.',
    type: 'website',
    locale: 'es_ES',
  },
};

export default function EsPage() {
  return <LandingPage locale="es" />;
}

