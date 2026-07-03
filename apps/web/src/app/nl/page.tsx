import { LandingPage } from '@/components/marketing/landing-page';

export const metadata = {
  title: 'QuickPanel360 - Clubbeheerplatform',
  description: 'Prive SaaS-systeem voor uitgebreid clubbeheer. Dispensatie, inventaris, kassa, leden, analyse en meer.',
  openGraph: {
    title: 'QuickPanel360 - Clubbeheerplatform',
    description: 'Operationele controle, traceerbaarheid, dispensatie, inventaris, kassa, analyse en meer. Alles in een privesysteem per organisatie.',
    type: 'website',
    locale: 'nl_NL',
  },
};

export default function NlPage() {
  return <LandingPage locale="nl" />;
}

