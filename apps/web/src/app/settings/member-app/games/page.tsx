'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { MemberAppAdminNav } from '@/components/member-app/member-app-admin-nav';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { CardGridSkeleton } from '@/components/ui/loading-state';
import { getJson, postJson, patchJson } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

/* ────────────────────────── Types ────────────────────────── */

type GameType = 'DAILY_CHECKIN' | 'QUIZ' | 'SPIN' | 'SURVEY' | 'CUSTOM' | 'BUBBLE_POP' | 'MEMORY_CARDS' | 'BLOCK_PUZZLE' | 'RUNNER' | 'REACTION_TAP';
type GameStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

interface QuizConfig {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Game {
  id: string;
  title: string;
  description: string | null;
  type: GameType;
  status: GameStatus;
  pointsReward: number;
  cooldownHours: number;
  maxPlaysPerDay: number;
  config: QuizConfig | null;
}

interface GameDraft {
  title: string;
  description: string;
  type: GameType;
  pointsReward: string;
  cooldownHours: string;
  maxPlaysPerDay: string;
  config: string;
}

/* ────────────────────────── Labels ────────────────────────── */

const gameTypeLabels: Record<GameType, string> = {
  DAILY_CHECKIN: 'Check-in diario',
  QUIZ: 'Quiz',
  SPIN: 'Ruleta',
  SURVEY: 'Encuesta',
  CUSTOM: 'Personalizado',
  BUBBLE_POP: 'Bubble Pop',
  MEMORY_CARDS: 'Memory Cards',
  BLOCK_PUZZLE: 'Block Puzzle',
  RUNNER: 'Runner',
  REACTION_TAP: 'Reaction Tap',
};

const statusLabels: Record<GameStatus, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  ARCHIVED: 'Archivado',
};

const statusVariant: Record<GameStatus, 'success' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'secondary',
};

const allGameTypes: GameType[] = ['DAILY_CHECKIN', 'QUIZ', 'BUBBLE_POP', 'MEMORY_CARDS', 'BLOCK_PUZZLE', 'RUNNER', 'REACTION_TAP', 'SURVEY', 'CUSTOM'];
const allStatuses: GameStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED'];

const emptyDraft: GameDraft = {
  title: '',
  description: '',
  type: 'DAILY_CHECKIN',
  pointsReward: '10',
  cooldownHours: '24',
  maxPlaysPerDay: '1',
  config: '',
};

function gameToDraft(game: Game): GameDraft {
  return {
    title: game.title,
    description: game.description ?? '',
    type: game.type,
    pointsReward: String(game.pointsReward),
    cooldownHours: String(game.cooldownHours),
    maxPlaysPerDay: String(game.maxPlaysPerDay),
    config: game.config ? JSON.stringify(game.config, null, 2) : '',
  };
}

/* ────────────────────────── Page ────────────────────────── */

export default function GamesAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('member_app.games.manage');

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GameDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function fetchGames() {
    setLoading(true);
    setError(false);
    getJson<Game[]>('/member-app-admin/games')
      .then(setGames)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManage) fetchGames();
    else setLoading(false);
  }, [canManage]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  }

  function openEdit(game: Game) {
    setEditingId(game.id);
    setDraft(gameToDraft(game));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      let parsedConfig: Record<string, unknown> | null = null;
      if (draft.config.trim()) {
        try {
          parsedConfig = JSON.parse(draft.config) as Record<string, unknown>;
        } catch {
          toast.error('El JSON de configuracion no es valido.');
          setSaving(false);
          return;
        }
      }

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        type: draft.type,
        pointsReward: Number(draft.pointsReward),
        cooldownHours: Number(draft.cooldownHours),
        maxPlaysPerDay: Number(draft.maxPlaysPerDay),
        config: parsedConfig,
      };

      if (editingId) {
        const updated = await patchJson<Game>(`/member-app-admin/games/${editingId}`, payload);
        setGames((prev) => prev.map((g) => (g.id === editingId ? updated : g)));
        toast.success('Juego actualizado.');
      } else {
        const created = await postJson<Game>('/member-app-admin/games', payload);
        setGames((prev) => [...prev, created]);
        toast.success('Juego creado.');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar el juego.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(game: Game, newStatus: GameStatus) {
    setTogglingId(game.id);
    try {
      const updated = await patchJson<Game>(`/member-app-admin/games/${game.id}`, { status: newStatus });
      setGames((prev) => prev.map((g) => (g.id === game.id ? updated : g)));
      toast.success(`Juego ${statusLabels[newStatus].toLowerCase()}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setTogglingId(null);
    }
  }

  if (!canManage) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes permisos para gestionar juegos." />
      </ProtectedLayout>
    );
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <MemberAppAdminNav />
          <PageHeader title="Juegos" />
          <CardGridSkeleton count={3} />
        </div>
      </ProtectedLayout>
    );
  }

  if (error) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <MemberAppAdminNav />
          <PageHeader title="Juegos" />
          <ErrorState message="No se pudo cargar los juegos." onRetry={fetchGames} />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <MemberAppAdminNav />
        <PageHeader
          title="Juegos"
          description="Gestiona los juegos disponibles para los socios en el portal."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nuevo juego
            </Button>
          }
        />

        {games.length === 0 ? (
          <EmptyState
            title="Sin juegos configurados"
            text="Crea el primer juego para que los socios puedan participar."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Nuevo juego
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <Card key={game.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{game.title}</h3>
                    <Badge variant={statusVariant[game.status]}>{statusLabels[game.status]}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{gameTypeLabels[game.type]}</Badge>
                  </div>
                  {game.description ? (
                    <p className="mt-2 text-xs text-text-muted line-clamp-2">{game.description}</p>
                  ) : null}
                  <div className="mt-3 space-y-1 text-xs text-text-muted">
                    <p>Puntos: {game.pointsReward}</p>
                    <p>Cooldown: {game.cooldownHours}h</p>
                    <p>Max por dia: {game.maxPlaysPerDay}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(game)}>
                    <Pencil size={13} />
                    Editar
                  </Button>
                  {allStatuses
                    .filter((s) => s !== game.status)
                    .map((s) => (
                      <Button
                        key={s}
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === game.id}
                        onClick={() => handleStatusChange(game, s)}
                      >
                        {togglingId === game.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : null}
                        {statusLabels[s]}
                      </Button>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar juego' : 'Nuevo juego'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos del juego existente.'
                : 'Rellena los datos para crear un nuevo juego.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Field
              label="Titulo"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <Field
              label="Descripcion"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-text-primary">Tipo</label>
              <select
                className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as GameType }))}
              >
                {allGameTypes.map((t) => (
                  <option key={t} value={t}>
                    {gameTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="Puntos"
                type="number"
                value={draft.pointsReward}
                onChange={(e) => setDraft((d) => ({ ...d, pointsReward: e.target.value }))}
              />
              <Field
                label="Cooldown (h)"
                type="number"
                value={draft.cooldownHours}
                onChange={(e) => setDraft((d) => ({ ...d, cooldownHours: e.target.value }))}
              />
              <Field
                label="Max/dia"
                type="number"
                value={draft.maxPlaysPerDay}
                onChange={(e) => setDraft((d) => ({ ...d, maxPlaysPerDay: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary">
                Config (JSON) <span className="text-xs text-text-muted">— opcional</span>
              </label>
              <textarea
                rows={4}
                className="mt-1.5 w-full rounded-lg border border-border-light bg-white px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={draft.config}
                onChange={(e) => setDraft((d) => ({ ...d, config: e.target.value }))}
                placeholder={
                  draft.type === 'QUIZ'
                    ? '{\n  "question": "...",\n  "options": ["A","B","C"],\n  "correctAnswer": "A"\n}'
                    : '{\n  "key": "value"\n}'
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !draft.title.trim()}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear juego'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
