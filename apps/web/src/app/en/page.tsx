import { LandingPage } from '@/components/marketing/landing-page';

export const metadata = {
  title: 'QuickPanel360 - Club management platform',
  description: 'Private SaaS system for comprehensive club management. Dispensing, inventory, cash register, members, analytics and more.',
  openGraph: {
    title: 'QuickPanel360 - Club management platform',
    description: 'Operational control, traceability, dispensing, inventory, cash register, analytics and more. All in a private system per organisation.',
    type: 'website',
    locale: 'en_GB',
  },
};

export default function EnPage() {
  return <LandingPage locale="en" />;
}

