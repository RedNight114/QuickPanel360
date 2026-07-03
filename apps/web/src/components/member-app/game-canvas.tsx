'use client';

import { useEffect, useRef } from 'react';

export interface GameCallbacks {
  onFinish: (score: number) => void;
  onError: (msg: string) => void;
}

interface GameCanvasProps {
  seed: string;
  config: Record<string, unknown> | null;
  callbacks: GameCallbacks;
  createScene: (
    game: Phaser.Game,
    seed: string,
    config: Record<string, unknown> | null,
    callbacks: GameCallbacks,
  ) => void;
}

export function GameCanvas({ seed, config, callbacks, createScene }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let destroyed = false;

    import('phaser').then((Phaser) => {
      if (destroyed || !containerRef.current) return;

      const w = containerRef.current.clientWidth;
      const h = Math.min(Math.round(w * 1.5), 620);

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: w,
        height: h,
        backgroundColor: '#15140F',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        input: { touch: true },
        render: { antialias: true, pixelArt: false },
        banner: false,
      });

      gameRef.current = game;
      createScene(game, seed, config, callbacks);
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/5"
      style={{ touchAction: 'none' }}
    />
  );
}
