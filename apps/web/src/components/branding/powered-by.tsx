'use client';

import { BrandMark } from './brand-mark';
import { branding } from '@/lib/branding';

export function PoweredBy({ className = '' }: { className?: string }) {
  return (
    <a
      href={`https://${branding.website}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 opacity-40 transition-opacity hover:opacity-70 ${className}`}
    >
      <BrandMark variant="badge" size={12} className="h-3 w-3 rounded-[3px]" />
      <span className="text-[9px] text-text-muted tracking-wide">
        Powered by <span className="font-medium">{branding.companyName}</span>
      </span>
    </a>
  );
}
