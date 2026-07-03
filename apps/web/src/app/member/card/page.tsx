'use client';

import { useEffect, useRef, useState } from 'react';
import { Star, Calendar } from 'lucide-react';
import { memberFetch, getMemberData } from '@/lib/member-api';

interface CardData {
  name: string;
  memberNumber: string;
  memberClass: string;
  clubName: string;
  joinDate: string;
  avatar: string | null;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function MemberCardPage() {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR once card data is loaded
  useEffect(() => {
    if (!card?.memberNumber || !qrCanvasRef.current) return;
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(qrCanvasRef.current!, card.memberNumber, {
        width: 160,
        margin: 1,
        color: { dark: '#FAF8F2', light: '#00000000' },
      });
    });
  }, [card]);

  useEffect(() => {
    memberFetch<CardData>('/member-app/card')
      .then(setCard)
      .catch(() => {
        // Fallback to cached data
        const cached = getMemberData();
        if (cached) {
          setCard({
            name: (cached.name as string) || 'Socio',
            memberNumber: (cached.memberNumber as string) || '',
            memberClass: (cached.memberClass as string) || 'Estandar',
            clubName: (cached.clubName as string) || '',
            joinDate: (cached.joinDate as string) || '',
            avatar: (cached.avatar as string) || null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6 p-4 pt-8">
        <div className="h-56 w-full max-w-sm animate-pulse rounded-2xl bg-[#E0DDD4]" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-[#7A7770]">No se pudo cargar el carnet</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#15140F] px-4 py-2 text-sm font-medium text-[#FAF8F2]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const initials = card.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-6 p-4 pt-8">
      <h1 className="text-lg font-bold text-[#15140F]">Carnet digital</h1>

      {/* Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#15140F] p-6 shadow-xl">
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#FFE600]/10" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[#FFE600]/5" />

        {/* Card content */}
        <div className="relative flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/branding/q-badge.svg" alt="" className="h-6 w-6 rounded" />
              <span className="text-xs font-semibold text-[#FAF8F2]/80">
                {card.clubName || 'Club Social'}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-[#FFE600]/20 px-2.5 py-1">
              <Star size={10} className="text-[#FFE600]" />
              <span className="text-[10px] font-bold text-[#FFE600]">{card.memberClass}</span>
            </div>
          </div>

          {/* Member info */}
          <div className="flex items-center gap-4">
            {card.avatar ? (
              <img
                src={card.avatar}
                alt={card.name}
                className="h-14 w-14 rounded-full border-2 border-[#FFE600]/30 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#FFE600]/30 bg-[#FAF8F2]/10 text-base font-bold text-[#FAF8F2]">
                {initials}
              </div>
            )}
            <div>
              <div className="text-base font-bold text-[#FAF8F2]">{card.name}</div>
              <div className="flex items-center gap-1 text-xs text-[#FAF8F2]/60">
                <Calendar size={10} />
                Socio desde {card.joinDate ? formatDate(card.joinDate) : '-'}
              </div>
            </div>
          </div>

          {/* QR + member number */}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#FAF8F2]/10 bg-[#FAF8F2]/5 px-4 py-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#FAF8F2]/40">
              Código QR de socio
            </div>
            {/* QR canvas — transparent bg so dark card shows through */}
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-lg bg-[#FAF8F2]/5">
              <canvas ref={qrCanvasRef} className="rounded-lg" />
            </div>
            <div className="font-mono text-lg font-bold tracking-[0.15em] text-[#FFE600]">
              {card.memberNumber || '---'}
            </div>
            <div className="text-[10px] text-[#FAF8F2]/30">
              Escanea o presenta este carnet en el club
            </div>
          </div>

          {/* Footer branding */}
          <div className="flex items-center justify-center gap-1.5">
            <img src="/branding/q-badge.svg" alt="" className="h-3 w-3 rounded-[2px] opacity-30" />
            <span className="text-[9px] text-[#FAF8F2]/25">QuickPanel360</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-sm rounded-xl border border-[#E0DDD4] bg-white p-4 shadow-sm">
        <p className="text-center text-xs text-[#7A7770]">
          Muestra el código QR al personal del club para identificarte como socio de forma rápida y segura.
        </p>
      </div>
    </div>
  );
}
