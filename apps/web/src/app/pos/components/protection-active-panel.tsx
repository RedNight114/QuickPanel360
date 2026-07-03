'use client';

import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function ProtectionActivePanel() {
  return (
    <Card className="border-green-100 bg-amber-50/70 p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-brand-primary">
          <ShieldCheck size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">Protección activa</p>
          <p className="truncate text-xs text-[#15140F]">
            Dispensaciones auditadas · Stock sincronizado · Permisos aplicados
          </p>
        </div>
      </div>
    </Card>
  );
}
