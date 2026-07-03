'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  X,
} from 'lucide-react';
import { getHelpForPath, type HelpSection } from './help-content';

export function HelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const help = getHelpForPath(pathname);

  if (!help) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-bg-soft hover:text-text-primary"
        aria-label="Ayuda contextual"
        title="Ayuda contextual"
      >
        <HelpCircle size={18} />
      </button>
      {open ? <HelpPanel help={help} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function HelpPanel({ help, onClose }: { help: HelpSection; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!mounted) return null;

  const content = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Ayuda: ${help.title}`}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderLeft: '1px solid #D9D4C7',
          boxShadow: '-4px 0 20px rgba(15,23,42,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border-light px-4 py-3" style={{ flexShrink: 0 }}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-primary text-white">
            <BookOpen size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-text-primary">{help.title}</h2>
            <p className="text-xs text-text-muted">Ayuda contextual</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-slate-100 hover:text-text-primary"
            aria-label="Cerrar ayuda"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="px-4 py-4">
          {/* Intro */}
          <p className="text-sm leading-relaxed text-text-secondary">{help.intro}</p>

          {/* FAQ */}
          {help.items.length > 0 ? (
            <div className="mt-5">
              <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                <HelpCircle size={12} />
                Preguntas frecuentes
              </h3>
              <div className="space-y-1">
                {help.items.map((item, index) => {
                  const isExpanded = expandedIndex === index;
                  return (
                    <div key={index} className="overflow-hidden rounded-lg border border-border-light">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-text-primary transition hover:bg-bg-soft"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} className="shrink-0 text-brand-primary" />
                        ) : (
                          <ChevronRight size={14} className="shrink-0 text-text-muted" />
                        )}
                        <span className="min-w-0">{item.question}</span>
                      </button>
                      {isExpanded ? (
                        <div className="border-t border-border-light bg-bg-soft px-3 py-2.5">
                          <p className="whitespace-pre-line text-xs leading-relaxed text-text-secondary">{item.answer}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Tips */}
          {help.tips && help.tips.length > 0 ? (
            <div className="mt-5">
              <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                <Lightbulb size={12} />
                Consejos
              </h3>
              <div className="space-y-1.5">
                {help.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2"
                  >
                    <Lightbulb size={12} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-xs leading-relaxed text-amber-800">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-border-light bg-slate-50 px-4 py-2.5" style={{ flexShrink: 0 }}>
          <p className="text-[11px] text-text-muted">
            Pulsa <kbd className="rounded border border-border-light bg-white px-1 py-0.5 text-[10px] font-mono text-text-secondary">Esc</kbd> para cerrar · La ayuda se adapta a cada sección
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

