'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuditLog } from '@/lib/types';

function JsonPreview({ value }: { value: unknown }) {
  if (!value) {
    return <p className="text-sm text-text-muted">Sin datos.</p>;
  }

  return (
    <pre className="max-h-72 overflow-auto rounded-xl border border-border-light bg-bg-soft p-4 text-xs leading-5 text-text-primary">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AuditTechnicalDetails({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border-light pt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown
          size={15}
          className={`mr-2 transition ${open ? 'rotate-180' : ''}`}
        />
        Ver datos tecnicos
      </Button>

      {open ? (
        <div className="mt-4 rounded-2xl border border-border-light bg-white p-4">
          <p className="font-semibold text-text-primary">Datos tecnicos para soporte</p>
          <div className="mt-4 grid gap-4 text-sm lg:grid-cols-2">
            <div className="space-y-2">
              <p>
                <span className="font-medium text-text-primary">Accion:</span>{' '}
                <span className="text-text-secondary">{log.action}</span>
              </p>
              <p>
                <span className="font-medium text-text-primary">Entidad:</span>{' '}
                <span className="text-text-secondary">{log.entityType ?? '-'}</span>
              </p>
              <p>
                <span className="font-medium text-text-primary">ID entidad:</span>{' '}
                <span className="break-all text-text-secondary">{log.entityId ?? '-'}</span>
              </p>
              <p>
                <span className="font-medium text-text-primary">Usuario:</span>{' '}
                <span className="break-all text-text-secondary">{log.userId ?? '-'}</span>
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <span className="font-medium text-text-primary">IP:</span>{' '}
                <span className="text-text-secondary">{log.ipAddress ?? '-'}</span>
              </p>
              <p>
                <span className="font-medium text-text-primary">User agent:</span>{' '}
                <span className="break-all text-text-secondary">{log.userAgent ?? '-'}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">Datos anteriores</p>
              <JsonPreview value={log.oldValue} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">Datos nuevos</p>
              <JsonPreview value={log.newValue} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
