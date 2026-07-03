'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Gamepad2,
  CalendarCheck,
  HelpCircle,
  Loader2,
  CheckCircle2,
  Star,
  Clock,
  Sparkles,
  Grid3X3,
  Zap,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { memberFetch } from '@/lib/member-api';
import { GameResultModal } from '@/components/member-app/game-result-modal';
import type { GameCallbacks } from '@/components/member-app/game-canvas';

const GameCanvas = dynamic(
  () =>
    import('@/components/member-app/game-canvas').then((m) => ({
      default: m.GameCanvas,
    })),
  { ssr: false },
);

type PhaserGameType = 'BUBBLE_POP' | 'MEMORY_CARDS' | 'BLOCK_PUZZLE' | 'RUNNER' | 'REACTION_TAP';
const PHASER_TYPES: string[] = ['BUBBLE_POP', 'MEMORY_CARDS', 'BLOCK_PUZZLE', 'RUNNER', 'REACTION_TAP'];

interface GameConfig {
  question?: string;
  options?: string[];
  correctAnswer?: string;
}

interface Game {
  id: string;
  title: string;
  description: string | null;
  type: string;
  pointsReward: number;
  config: GameConfig | null;
  canPlay: boolean;
  nextPlayAt: string | null;
  todayPlays: number;
  maxPlaysPerDay: number;
}

interface GamesResponse {
  games: Game[];
}

interface PlayResult {
  success: boolean;
  pointsEarned: number;
  message?: string;
  correct?: boolean;
}

interface SessionStart {
  sessionId: string;
  seed: string;
  expiresAt: string;
  config: Record<string, unknown> | null;
  pointsReward: number;
}

interface SessionFinish {
  sessionId: string;
  score: number;
  pointsEarned: number;
  message: string;
}

interface GameHistoryEntry {
  id: string;
  score: number | null;
  pointsAwarded: number | null;
  finishedAt: string | null;
}

interface GameHistory {
  bestScore: number | null;
  totalPlays: number;
  recent: GameHistoryEntry[];
}

function formatTimeLeft(nextPlayAt: string): string {
  const diff = new Date(nextPlayAt).getTime() - Date.now();
  if (diff <= 0) return 'Disponible ahora';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Disponible en ${hours}h ${minutes}m`;
  return `Disponible en ${minutes}m`;
}

function GameIcon({ type }: { type: string }) {
  switch (type) {
    case 'DAILY_CHECKIN':
      return <CalendarCheck size={22} className="text-[#15140F]" />;
    case 'QUIZ':
      return <HelpCircle size={22} className="text-[#15140F]" />;
    case 'BUBBLE_POP':
      return <Sparkles size={22} className="text-[#15140F]" />;
    case 'MEMORY_CARDS':
      return <Grid3X3 size={22} className="text-[#15140F]" />;
    case 'REACTION_TAP':
      return <Zap size={22} className="text-[#15140F]" />;
    default:
      return <Gamepad2 size={22} className="text-[#15140F]" />;
  }
}

function getGameLabel(type: string): string {
  switch (type) {
    case 'BUBBLE_POP':
      return 'Bubble Pop';
    case 'MEMORY_CARDS':
      return 'Memory Cards';
    case 'BLOCK_PUZZLE':
      return 'Block Puzzle';
    case 'RUNNER':
      return 'Runner';
    case 'REACTION_TAP':
      return 'Reaction Tap';
    default:
      return 'Mini Juego';
  }
}

export default function MemberGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // History state — keyed by gameId
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<string, GameHistory>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  const toggleHistory = useCallback(async (gameId: string) => {
    const isOpen = historyOpen[gameId];
    setHistoryOpen((prev) => ({ ...prev, [gameId]: !isOpen }));

    if (!isOpen && !historyData[gameId]) {
      setHistoryLoading((prev) => ({ ...prev, [gameId]: true }));
      try {
        const res = await memberFetch<{ bestScore: number | null; totalPlays: number; recent: GameHistoryEntry[] }>(
          `/member-app/games/${gameId}/history`,
        );
        setHistoryData((prev) => ({ ...prev, [gameId]: res }));
      } catch {
        // silently fail — history is optional UI
      } finally {
        setHistoryLoading((prev) => ({ ...prev, [gameId]: false }));
      }
    }
  }, [historyOpen, historyData]);

  // Phaser game state
  const [activeSession, setActiveSession] = useState<{
    game: Game;
    sessionId: string;
    seed: string;
    config: Record<string, unknown> | null;
  } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    pointsEarned: number;
    message: string;
    gameId: string;
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  const fetchGames = useCallback(() => {
    setLoading(true);
    setError(null);
    memberFetch<GamesResponse>('/member-app/games')
      .then((res) => setGames(res.games))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar juegos'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // ── Classic game play (checkin, quiz, etc.) ──
  const handlePlay = async (game: Game, answer?: string) => {
    setPlayingId(game.id);
    try {
      const body: Record<string, unknown> = {};
      if (game.type === 'QUIZ' && answer) {
        body.answer = answer;
      }
      const res = await memberFetch<PlayResult>(
        `/member-app/games/${game.id}/play`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      if (res.success) {
        showToast(res.message || `+${res.pointsEarned} puntos ganados`, 'success');
      } else {
        showToast(res.message || 'Intenta de nuevo', 'info');
      }
      fetchGames();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al jugar', 'error');
    } finally {
      setPlayingId(null);
    }
  };

  // ── Phaser game session start ──
  const handleStartSession = async (game: Game) => {
    setSessionLoading(true);
    try {
      const res = await memberFetch<SessionStart>(
        `/member-app/games/${game.id}/start`,
        { method: 'POST' },
      );
      setActiveSession({
        game,
        sessionId: res.sessionId,
        seed: res.seed,
        config: res.config,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al iniciar juego', 'error');
    } finally {
      setSessionLoading(false);
    }
  };

  // ── Phaser game finish ──
  const handleFinishSession = async (score: number) => {
    if (!activeSession) return;
    try {
      const res = await memberFetch<SessionFinish>(
        `/member-app/games/sessions/${activeSession.sessionId}/finish`,
        { method: 'POST', body: JSON.stringify({ score }) },
      );
      setResult({
        score: res.score,
        pointsEarned: res.pointsEarned,
        message: res.message,
        gameId: activeSession.game.id,
      });
      setActiveSession(null);
      fetchGames();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al finalizar', 'error');
      setActiveSession(null);
    }
  };

  const getCreateScene = (type: string) => {
    switch (type) {
      case 'BUBBLE_POP':
        return async () => {
          const { createBubblePopScene } = await import(
            '@/components/member-app/bubble-pop-scene'
          );
          return createBubblePopScene;
        };
      case 'MEMORY_CARDS':
        return async () => {
          const { createMemoryCardsScene } = await import(
            '@/components/member-app/memory-cards-scene'
          );
          return createMemoryCardsScene;
        };
      case 'REACTION_TAP':
        return async () => {
          const { createReactionTapScene } = await import(
            '@/components/member-app/reaction-tap-scene'
          );
          return createReactionTapScene;
        };
      default:
        return null;
    }
  };

  // ── Active Phaser game view ──
  if (activeSession) {
    const loader = getCreateScene(activeSession.game.type);
    if (!loader) {
      setActiveSession(null);
      return null;
    }

    return (
      <PhaserGameView
        game={activeSession.game}
        seed={activeSession.seed}
        config={activeSession.config}
        loadScene={loader}
        onFinish={handleFinishSession}
        onCancel={() => setActiveSession(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[#E0DDD4]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">{error}</p>
        <button
          onClick={fetchGames}
          className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      {toast && (
        <div
          className={`fixed left-4 right-4 top-16 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-[#15140F] text-[#FAF8F2]'
          }`}
        >
          {toast.message}
        </div>
      )}

      {result && (
        <GameResultModal
          score={result.score}
          pointsEarned={result.pointsEarned}
          message={result.message}
          onClose={() => setResult(null)}
          onRetry={() => {
            const game = games.find((g) => g.id === result.gameId);
            setResult(null);
            if (game && game.canPlay) handleStartSession(game);
          }}
        />
      )}

      <div>
        <h1 className="text-lg font-bold text-[#15140F]">Juegos</h1>
        <p className="text-sm text-[#7A7770]">Gana puntos jugando cada dia</p>
      </div>

      {games.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E0DDD4] bg-white py-12 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2EFE6]">
            <Gamepad2 size={24} className="text-[#A8A5A0]" />
          </div>
          <p className="text-sm text-[#7A7770]">No hay juegos disponibles</p>
        </div>
      )}

      {games.map((game) => (
        <div
          key={game.id}
          className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-sm"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F2EFE6]">
              <GameIcon type={game.type} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#15140F]">{game.title}</h3>
                {PHASER_TYPES.includes(game.type) && (
                  <span className="rounded-md bg-[#FFE600]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#15140F]">
                    {getGameLabel(game.type)}
                  </span>
                )}
              </div>
              {game.description && (
                <p className="mt-0.5 text-xs text-[#7A7770]">{game.description}</p>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <Star size={12} className="text-[#FFE600]" />
                <span className="text-xs font-semibold text-[#15140F]">
                  +{game.pointsReward} puntos
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#F2EFE6] p-4">
            {!game.canPlay && (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 size={20} className="text-green-600" />
                </div>
                <p className="text-sm font-medium text-[#15140F]">Ya participaste hoy</p>
                {game.nextPlayAt && (
                  <div className="flex items-center gap-1 text-xs text-[#7A7770]">
                    <Clock size={12} />
                    {formatTimeLeft(game.nextPlayAt)}
                  </div>
                )}
              </div>
            )}

            {game.canPlay && game.type === 'DAILY_CHECKIN' && (
              <button
                onClick={() => handlePlay(game)}
                disabled={playingId === game.id}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15140F] px-6 py-4 text-base font-bold text-[#FAF8F2] transition hover:bg-[#2A2920] active:scale-[0.98] disabled:opacity-60"
              >
                {playingId === game.id ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <CalendarCheck size={20} />
                    Hacer check-in
                  </>
                )}
              </button>
            )}

            {game.canPlay && game.type === 'QUIZ' && game.config?.question && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-[#15140F]">
                  {game.config.question}
                </p>
                <div className="flex flex-col gap-2">
                  {(game.config.options || []).map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        setSelectedAnswers((prev) => ({ ...prev, [game.id]: option }))
                      }
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                        selectedAnswers[game.id] === option
                          ? 'border-[#FFE600] bg-[#FFE600]/10 text-[#15140F]'
                          : 'border-[#E0DDD4] bg-white text-[#4A4840] hover:border-[#A8A5A0]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handlePlay(game, selectedAnswers[game.id])}
                  disabled={!selectedAnswers[game.id] || playingId === game.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15140F] px-6 py-3.5 text-sm font-bold text-[#FAF8F2] transition hover:bg-[#2A2920] active:scale-[0.98] disabled:opacity-60"
                >
                  {playingId === game.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'Enviar respuesta'
                  )}
                </button>
              </div>
            )}

            {/* Phaser games */}
            {game.canPlay && PHASER_TYPES.includes(game.type) && (
              <button
                onClick={() => handleStartSession(game)}
                disabled={sessionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15140F] px-6 py-4 text-base font-bold text-[#FAF8F2] transition hover:bg-[#2A2920] active:scale-[0.98] disabled:opacity-60"
              >
                {sessionLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Gamepad2 size={20} />
                    Jugar {getGameLabel(game.type)}
                  </>
                )}
              </button>
            )}

            {/* Generic non-phaser games */}
            {game.canPlay &&
              !PHASER_TYPES.includes(game.type) &&
              game.type !== 'DAILY_CHECKIN' &&
              game.type !== 'QUIZ' && (
                <button
                  onClick={() => handlePlay(game)}
                  disabled={playingId === game.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15140F] px-6 py-3.5 text-sm font-bold text-[#FAF8F2] transition hover:bg-[#2A2920] active:scale-[0.98] disabled:opacity-60"
                >
                  {playingId === game.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Gamepad2 size={18} />
                      Jugar
                    </>
                  )}
                </button>
              )}
          </div>

          {game.maxPlaysPerDay > 1 && (
            <div className="border-t border-[#F2EFE6] px-4 py-2">
              <p className="text-center text-[10px] text-[#A8A5A0]">
                {game.todayPlays} / {game.maxPlaysPerDay} jugadas hoy
              </p>
            </div>
          )}

          {/* History panel — only for Phaser games */}
          {PHASER_TYPES.includes(game.type) && (
            <div className="border-t border-[#F2EFE6]">
              <button
                onClick={() => toggleHistory(game.id)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-[#7A7770] transition hover:bg-[#FAF8F2]"
              >
                <span className="flex items-center gap-1.5">
                  <Trophy size={12} />
                  Tu historial
                  {historyData[game.id]?.bestScore != null && (
                    <span className="rounded-md bg-[#FFE600]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#15140F]">
                      Mejor: {historyData[game.id].bestScore}
                    </span>
                  )}
                </span>
                {historyOpen[game.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {historyOpen[game.id] && (
                <div className="border-t border-[#F2EFE6] bg-[#FAF8F2] px-4 py-3">
                  {historyLoading[game.id] ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={18} className="animate-spin text-[#A8A5A0]" />
                    </div>
                  ) : historyData[game.id]?.recent.length === 0 ? (
                    <p className="py-2 text-center text-xs text-[#A8A5A0]">
                      Sin partidas registradas aún
                    </p>
                  ) : (
                    <div className="flex flex-col gap-0">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A5A0]">
                          Últimas partidas
                        </span>
                        <span className="text-[10px] text-[#A8A5A0]">
                          {historyData[game.id]?.totalPlays ?? 0} total
                        </span>
                      </div>
                      {(historyData[game.id]?.recent ?? []).map((entry, i) => (
                        <div
                          key={entry.id}
                          className={`flex items-center justify-between py-2 ${
                            i < (historyData[game.id]?.recent.length ?? 0) - 1
                              ? 'border-b border-[#E0DDD4]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                                i === 0
                                  ? 'bg-[#FFE600] text-[#15140F]'
                                  : 'bg-[#E0DDD4] text-[#7A7770]'
                              }`}
                            >
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-[#15140F]">
                                {entry.score ?? 0} pts
                              </p>
                              {entry.finishedAt && (
                                <p className="text-[10px] text-[#A8A5A0]">
                                  {new Date(entry.finishedAt).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                          {(entry.pointsAwarded ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-[#15140F]">
                              <Star size={10} className="text-[#FFE600]" />
                              +{entry.pointsAwarded} CR
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Phaser game full-screen view ──

function PhaserGameView({
  game,
  seed,
  config,
  loadScene,
  onFinish,
  onCancel,
}: {
  game: Game;
  seed: string;
  config: Record<string, unknown> | null;
  loadScene: () => Promise<
    (
      game: Phaser.Game,
      seed: string,
      config: Record<string, unknown> | null,
      callbacks: GameCallbacks,
    ) => void
  >;
  onFinish: (score: number) => void;
  onCancel: () => void;
}) {
  const [createScene, setCreateScene] = useState<
    | ((
        g: Phaser.Game,
        s: string,
        c: Record<string, unknown> | null,
        cb: GameCallbacks,
      ) => void)
    | null
  >(null);
  const [sceneLoading, setSceneLoading] = useState(true);

  useEffect(() => {
    loadScene().then((fn) => {
      setCreateScene(() => fn);
      setSceneLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callbacks: GameCallbacks = {
    onFinish,
    onError: (msg) => {
      console.error('Game error:', msg);
      onCancel();
    },
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#15140F]">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-[#FAF8F2]">{game.title}</h2>
          <p className="text-xs text-[#7A7770]">{getGameLabel(game.type)}</p>
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg border border-[#3A3930] px-3 py-1.5 text-xs font-medium text-[#FAF8F2] transition hover:bg-[#2A2920]"
        >
          Salir
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-4">
        {sceneLoading || !createScene ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#FFE600]" />
            <p className="text-sm text-[#7A7770]">Cargando juego...</p>
          </div>
        ) : (
          <GameCanvas
            seed={seed}
            config={config}
            callbacks={callbacks}
            createScene={createScene}
          />
        )}
      </div>
    </div>
  );
}
