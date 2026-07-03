'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from './button';

type SignaturePadProps = {
  width?: number;
  height?: number;
  onSignatureChange: (dataUrl: string | null) => void;
  label?: string;
};

export function SignaturePad({
  width = 400,
  height = 160,
  onSignatureChange,
  label = 'Firma del responsable',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#15140F';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  }, []);

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const emitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSignatureChange(canvas.toDataURL('image/png'));
  }, [onSignatureChange]);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;
    setDrawing(true);
    lastPoint.current = point;
    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
  }, [getPoint, getCtx]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const point = getPoint(e);
    if (!point) return;
    const ctx = getCtx();
    if (ctx && lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPoint.current = point;
    setHasSignature(true);
  }, [drawing, getPoint, getCtx]);

  const endDraw = useCallback(() => {
    if (drawing) {
      setDrawing(false);
      lastPoint.current = null;
      emitSignature();
    }
  }, [drawing, emitSignature]);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  }

  useEffect(() => {
    const handler = () => endDraw();
    window.addEventListener('mouseup', handler);
    window.addEventListener('touchend', handler);
    return () => {
      window.removeEventListener('mouseup', handler);
      window.removeEventListener('touchend', handler);
    };
  }, [endDraw]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        {hasSignature ? (
          <Button type="button" variant="ghost" size="xs" onClick={clear}>
            <Eraser size={13} />
            Borrar
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border-2 border-dashed border-border-light bg-white p-1 transition-colors hover:border-brand-primary/30">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair touch-none"
          style={{ height: `${height / 2}px` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onTouchStart={startDraw}
          onTouchMove={draw}
        />
      </div>
      {!hasSignature ? (
        <p className="mt-1 text-center text-[11px] text-text-muted">Dibuja tu firma con el dedo o ratón</p>
      ) : null}
    </div>
  );
}

