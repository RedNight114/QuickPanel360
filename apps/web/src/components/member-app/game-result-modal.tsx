'use client';

import { useEffect, useState } from 'react';
import { Star, RotateCcw, ArrowLeft, Trophy } from 'lucide-react';

interface GameResultModalProps {
  score: number;
  pointsEarned: number;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function GameResultModal({
  score,
  pointsEarned,
  message,
  onClose,
  onRetry,
}: GameResultModalProps) {
  const [visible, setVisible] = useState(false);
  const [scoreAnimated, setScoreAnimated] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Animate score counter
    const target = score;
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setScoreAnimated(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'bg-black/70' : 'bg-black/0'
      }`}
    >
      <div
        className={`relative w-full max-w-xs overflow-hidden rounded-2xl bg-gradient-to-b from-[#1e1d18] to-[#15140F] shadow-2xl transition-all duration-500 ${
          visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        {/* Decorative top glow */}
        <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#FFE600]/10 blur-3xl" />

        <div className="relative px-6 pb-6 pt-8 text-center">
          {/* Trophy icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFE600]/10 ring-1 ring-[#FFE600]/20">
            <Trophy size={30} className="text-[#FFE600]" />
          </div>

          <h2 className="text-lg font-bold text-[#FAF8F2]">Partida terminada</h2>

          {/* Score */}
          <div className="mt-4">
            <p className="text-5xl font-black tabular-nums text-[#FFE600]">
              {scoreAnimated}
            </p>
            <p className="mt-1 text-xs text-[#7A7770]">puntos de juego</p>
          </div>

          {/* Points earned badge */}
          {pointsEarned > 0 && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FFE600]/10 px-4 py-2 ring-1 ring-[#FFE600]/20">
              <Star size={14} className="text-[#FFE600]" />
              <span className="text-sm font-bold text-[#FFE600]">
                +{pointsEarned} CR ganados
              </span>
            </div>
          )}

          <p className="mt-3 text-sm text-[#7A7770]">{message}</p>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2.5">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFE600] px-4 py-3.5 text-sm font-bold text-[#15140F] transition active:scale-[0.98]"
              >
                <RotateCcw size={16} />
                Jugar de nuevo
              </button>
            )}
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3A3930] px-4 py-3 text-sm font-medium text-[#FAF8F2] transition hover:bg-[#1e1d18]"
            >
              <ArrowLeft size={16} />
              Volver a juegos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
