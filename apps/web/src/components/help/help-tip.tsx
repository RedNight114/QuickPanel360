'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

type HelpTipProps = {
  text: string;
  title?: string;
  size?: number;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
  variant?: 'default' | 'info' | 'warning';
};

const variantStyles = {
  default: {
    bg: 'bg-gray-900',
    text: 'text-gray-100',
    title: 'text-white',
    border: 'border-gray-800',
    arrow: '#15140F',
  },
  info: {
    bg: 'bg-blue-900',
    text: 'text-blue-100',
    title: 'text-white',
    border: 'border-blue-800',
    arrow: '#1e3a5f',
  },
  warning: {
    bg: 'bg-amber-900',
    text: 'text-amber-100',
    title: 'text-white',
    border: 'border-amber-800',
    arrow: '#78350f',
  },
};

export function HelpTip({
  text,
  title,
  size = 14,
  className = '',
  side = 'top',
  maxWidth = 260,
  variant = 'default',
}: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; actualSide: typeof side } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const show = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipW = tooltip?.offsetWidth ?? maxWidth;
    const tooltipH = tooltip?.offsetHeight ?? 60;
    const gap = 8;
    const margin = 12;

    let top = 0;
    let left = 0;
    let actualSide = side;

    if (side === 'top') {
      top = rect.top - tooltipH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      if (top < margin) { actualSide = 'bottom'; top = rect.bottom + gap; }
    } else if (side === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      if (top + tooltipH > window.innerHeight - margin) { actualSide = 'top'; top = rect.top - tooltipH - gap; }
    } else if (side === 'left') {
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - gap;
      if (left < margin) { actualSide = 'right'; left = rect.right + gap; }
    } else {
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + gap;
      if (left + tooltipW > window.innerWidth - margin) { actualSide = 'left'; left = rect.left - tooltipW - gap; }
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipW - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipH - margin));

    setPosition({ top, left, actualSide });
  }, [side, maxWidth]);

  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(updatePosition);

    function handleClickOutside(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open, updatePosition]);

  const vs = variantStyles[variant];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Ayuda"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => { show(); updatePosition(); }}
        onMouseLeave={hide}
        className={`inline-flex cursor-help rounded-full text-text-muted/60 transition-colors hover:text-brand-primary focus:text-brand-primary focus:outline-none ${className}`}
      >
        <HelpCircle size={size} />
      </button>

      {open && mounted && position
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              onMouseEnter={show}
              onMouseLeave={hide}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 99999,
                maxWidth,
                width: 'max-content',
              }}
              className={`rounded-lg ${vs.bg} ${vs.border} border px-3 py-2 shadow-xl`}
            >
              {/* Arrow */}
              <Arrow side={position.actualSide} color={vs.arrow} triggerRef={triggerRef} tooltipLeft={position.left} />

              {title ? (
                <p className={`mb-1 text-[11px] font-semibold ${vs.title}`}>{title}</p>
              ) : null}
              <p className={`text-[11px] leading-relaxed ${vs.text}`}>{text}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Arrow({
  side,
  color,
  triggerRef,
  tooltipLeft,
}: {
  side: 'top' | 'bottom' | 'left' | 'right';
  color: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  tooltipLeft: number;
}) {
  const triggerRect = triggerRef.current?.getBoundingClientRect();
  if (!triggerRect) return null;

  const arrowSize = 6;

  if (side === 'top' || side === 'bottom') {
    const arrowLeft = Math.max(12, Math.min(
      triggerRect.left + triggerRect.width / 2 - tooltipLeft - arrowSize,
      260 - 24,
    ));

    return (
      <div
        style={{
          position: 'absolute',
          [side === 'top' ? 'bottom' : 'top']: -arrowSize,
          left: arrowLeft,
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          [side === 'top' ? 'borderTop' : 'borderBottom']: `${arrowSize}px solid ${color}`,
        }}
      />
    );
  }

  return null;
}

