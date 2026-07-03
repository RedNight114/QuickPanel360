'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/components/branding/brand-mark';
import { branding } from '@/lib/branding';

export function LegalLayout({
  title,
  lastUpdated,
  children,
  locale = 'es',
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
  locale?: string;
}) {
  return (
    <div className="min-h-screen bg-[#FAF8F2]">
      <header className="border-b border-[#D9D4C7] bg-[#FAF8F2]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <BrandMark variant="ink" size={28} className="h-8 w-8" />
            <div>
              <span className="block text-lg font-bold text-white">{branding.appName}</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-[#8A8478]">
                by {branding.companyName}
              </span>
            </div>
          </Link>
          <Link href={`/${locale}`} className="flex items-center gap-1.5 text-sm text-[#5F5A50] hover:text-white">
            <ArrowLeft size={14} />
            Volver
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-[#8A8478]">Ultima actualizacion: {lastUpdated}</p>
        <div className="prose mt-8 max-w-none prose-headings:text-white prose-p:text-[#5F5A50] prose-li:text-[#5F5A50] prose-strong:text-white">
          {children}
        </div>
      </main>
      <footer className="border-t border-[#D9D4C7] py-8 text-center text-xs text-[#8A8478]">
        © 2026 {branding.companyName}. Todos los derechos reservados.
      </footer>
    </div>
  );
}
