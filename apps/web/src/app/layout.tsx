import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { AppErrorBoundary } from '@/components/errors/app-error-boundary';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { branding } from '@/lib/branding';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: branding.yellow,
};

export const metadata: Metadata = {
  title: branding.appName,
  description: branding.description,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: branding.appName,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml', rel: 'shortcut icon' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body>
        <AppErrorBoundary>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </AppErrorBoundary>
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegister />
        <OfflineIndicator />
      </body>
    </html>
  );
}
