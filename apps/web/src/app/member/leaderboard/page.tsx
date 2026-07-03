'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy, Star, Loader2, Crown, Medal } from 'lucide-react';
import { memberFetch } from '@/lib/member-api';

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  name: string;
  memberClass: string | null;
  photoUrl: string | null;
  totalPoints: number;
  isMe: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank: number | null;
  total: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE600] text-[#15140F]">
        <Crown size={14} strokeWidth={2.5} />
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C0C0C0] text-white">
        <Medal size={14} strokeWidth={2.5} />
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#CD7F32] text-white">
        <Medal size={14} strokeWidth={2.5} />
      </span>
    );
  return (
    <span className="flex h-7 w-7 items-center justify-center text-sm font-bold text-[#A8A5A0]">
      {rank}
    </span>
  );
}

function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl: string | null; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const cls = size === 'sm'
    ? 'h-8 w-8 text-xs'
    : 'h-10 w-10 text-sm';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${cls} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-[#E0DDD4] font-bold text-[#5A5750]`}>
      {initials}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(() => {
    setLoading(true);
    setError(null);
    memberFetch<LeaderboardResponse>('/member-app/leaderboard')
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar el ranking'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[#E0DDD4]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#E0DDD4]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">{error}</p>
        <button
          onClick={fetchLeaderboard}
          className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const myRank = data?.myRank;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#15140F]">Ranking del club</h1>
        <p className="text-sm text-[#7A7770]">
          {data?.total ?? 0} socios · {myRank ? `Tu posición: #${myRank}` : 'Gana puntos para aparecer'}
        </p>
      </div>

      {/* My position sticky banner if not in top 10 */}
      {myRank && myRank > 10 && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#FFE600]/40 bg-[#FFE600]/10 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE600] text-sm font-bold text-[#15140F]">
            #{myRank}
          </span>
          <div>
            <p className="text-xs font-semibold text-[#15140F]">Tu posición actual</p>
            <p className="text-[10px] text-[#7A7770]">
              Sigue jugando y acumulando puntos para subir
            </p>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <Star size={12} className="text-[#FFE600]" />
            <span className="text-sm font-bold text-[#15140F]">
              {entries.find((e) => e.isMe)?.totalPoints ?? 0}
            </span>
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-sm">
          <div className="border-b border-[#F2EFE6] px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#15140F]">
              <Trophy size={13} className="text-[#FFE600]" />
              Top 3
            </p>
          </div>
          <div className="flex items-end justify-center gap-4 px-4 py-6">
            {/* 2nd place */}
            {top3[1] && (
              <div className="flex flex-col items-center gap-2">
                <Avatar name={top3[1].name} photoUrl={top3[1].photoUrl} />
                <div className="flex h-16 w-20 flex-col items-center justify-center rounded-t-2xl bg-[#F2EFE6]">
                  <Medal size={16} className="text-[#C0C0C0]" />
                  <span className="mt-1 text-[10px] font-bold text-[#5A5750]">
                    {top3[1].totalPoints} CR
                  </span>
                </div>
                <p className={`max-w-[72px] truncate text-center text-[11px] font-semibold ${top3[1].isMe ? 'text-[#15140F]' : 'text-[#5A5750]'}`}>
                  {top3[1].isMe ? 'Tú' : top3[1].name.split(' ')[0]}
                </p>
              </div>
            )}

            {/* 1st place */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar name={top3[0].name} photoUrl={top3[0].photoUrl} />
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">👑</span>
              </div>
              <div className="flex h-24 w-20 flex-col items-center justify-center rounded-t-2xl bg-[#FFE600]">
                <span className="text-lg font-black text-[#15140F]">1</span>
                <span className="text-[10px] font-bold text-[#15140F]">
                  {top3[0].totalPoints} CR
                </span>
              </div>
              <p className={`max-w-[72px] truncate text-center text-[11px] font-bold ${top3[0].isMe ? 'text-[#15140F]' : 'text-[#5A5750]'}`}>
                {top3[0].isMe ? 'Tú' : top3[0].name.split(' ')[0]}
              </p>
            </div>

            {/* 3rd place */}
            {top3[2] && (
              <div className="flex flex-col items-center gap-2">
                <Avatar name={top3[2].name} photoUrl={top3[2].photoUrl} />
                <div className="flex h-10 w-20 flex-col items-center justify-center rounded-t-2xl bg-[#F2EFE6]">
                  <Medal size={14} className="text-[#CD7F32]" />
                  <span className="mt-0.5 text-[10px] font-bold text-[#5A5750]">
                    {top3[2].totalPoints} CR
                  </span>
                </div>
                <p className={`max-w-[72px] truncate text-center text-[11px] font-semibold ${top3[2].isMe ? 'text-[#15140F]' : 'text-[#5A5750]'}`}>
                  {top3[2].isMe ? 'Tú' : top3[2].name.split(' ')[0]}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rest of ranking */}
      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#E0DDD4] bg-white shadow-sm">
          {rest.map((entry, i) => (
            <div
              key={entry.memberId}
              className={`flex items-center gap-3 px-4 py-3 ${
                entry.isMe ? 'bg-[#FFE600]/8' : ''
              } ${i < rest.length - 1 ? 'border-b border-[#F2EFE6]' : ''}`}
            >
              <RankBadge rank={entry.rank} />
              <Avatar name={entry.name} photoUrl={entry.photoUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={`truncate text-sm font-semibold ${entry.isMe ? 'text-[#15140F]' : 'text-[#2A2920]'}`}>
                  {entry.isMe ? `${entry.name} (Tú)` : entry.name}
                </p>
                {entry.memberClass && (
                  <p className="text-[10px] text-[#A8A5A0]">{entry.memberClass}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Star size={12} className="text-[#FFE600]" />
                <span className="text-sm font-bold text-[#15140F]">
                  {entry.totalPoints}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E0DDD4] bg-white py-12 text-center shadow-sm">
          <Trophy size={28} className="text-[#A8A5A0]" />
          <p className="text-sm text-[#7A7770]">Aún no hay socios en el ranking</p>
        </div>
      )}
    </div>
  );
}
