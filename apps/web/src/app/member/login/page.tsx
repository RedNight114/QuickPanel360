'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, KeyRound, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { setMemberAuth } from '@/lib/member-api';
import { branding } from '@/lib/branding';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type LoginStep = 'email' | 'code';

export default function MemberLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('t') || '';

  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRequestAccess(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API}/member-auth/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Error al solicitar acceso' }));
        throw new Error(body.message || 'Error al solicitar acceso');
      }

      setMessage('Codigo enviado. Revisa tu email.');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/member-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, email, code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Codigo incorrecto o expirado' }));
        throw new Error(body.message || 'Codigo incorrecto o expirado');
      }

      const data = await res.json();
      setMemberAuth(data.accessToken ?? data.token, { ...data.member, tenantId });
      router.replace('/member/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#15140F] px-4 py-8">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#FFE600]/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#FFE600]/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Branding header */}
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex items-center justify-center">
            <div className="relative">
              <img
                src="/branding/q-badge.svg"
                alt=""
                className="h-16 w-16 rounded-2xl shadow-lg shadow-[#FFE600]/20"
              />
              <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#FAF8F2] shadow-sm">
                <ShieldCheck size={14} className="text-[#15140F]" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#FAF8F2]">
            Portal del Socio
          </h1>
          <p className="mt-1.5 text-sm text-[#FAF8F2]/60">
            Accede a tu cuenta de socio
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.24em] text-[#FFE600]">
            by {branding.companyName}
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[#FAF8F2]/10 bg-[#FAF8F2]/5 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="rounded-xl bg-[#FAF8F2] p-6 sm:p-8">
            {step === 'email' ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-[#15140F]">Acceder</h2>
                  <p className="mt-0.5 text-sm text-[#7A7770]">
                    Introduce tu email de socio para recibir un codigo de acceso
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleRequestAccess}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#15140F]">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-[#A8A5A0]" />
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 w-full rounded-xl border border-[#E0DDD4] bg-[#F2EFE6] pl-10 pr-4 text-sm text-[#15140F] outline-none transition placeholder:text-[#A8A5A0] focus:border-[#15140F] focus:bg-white focus:ring-4 focus:ring-[#FFE600]/20"
                      />
                    </div>
                  </div>

                  {!tenantId && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                      <p className="text-sm text-amber-700">
                        Usa el enlace proporcionado por tu club para acceder.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email || !tenantId}
                    className="h-12 w-full rounded-xl bg-[#15140F] text-sm font-semibold text-[#FAF8F2] shadow-md transition-all hover:bg-[#2A2820] disabled:bg-[#E0DDD4] disabled:text-[#A8A5A0] disabled:shadow-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FAF8F2]/30 border-t-[#FAF8F2]" />
                        Enviando...
                      </span>
                    ) : (
                      'Solicitar codigo'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                      setMessage(null);
                    }}
                    className="mb-3 flex items-center gap-1 text-sm text-[#7A7770] transition hover:text-[#15140F]"
                  >
                    <ArrowLeft size={14} />
                    Volver
                  </button>
                  <h2 className="text-lg font-bold text-[#15140F]">Introduce el codigo</h2>
                  <p className="mt-0.5 text-sm text-[#7A7770]">
                    Hemos enviado un codigo de 6 digitos a{' '}
                    <span className="font-medium text-[#15140F]">{email}</span>
                  </p>
                </div>

                {message && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <ShieldCheck size={18} className="shrink-0 text-green-600" />
                    <p className="text-sm text-green-700">{message}</p>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleLogin}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#15140F]">
                      Codigo de acceso
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3.5 top-3.5 text-[#A8A5A0]" />
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        className="h-12 w-full rounded-xl border border-[#E0DDD4] bg-[#F2EFE6] pl-10 pr-4 text-center text-lg font-mono tracking-[0.5em] text-[#15140F] outline-none transition placeholder:tracking-[0.5em] placeholder:text-[#A8A5A0] focus:border-[#15140F] focus:bg-white focus:ring-4 focus:ring-[#FFE600]/20"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="h-12 w-full rounded-xl bg-[#15140F] text-sm font-semibold text-[#FAF8F2] shadow-md transition-all hover:bg-[#2A2820] disabled:bg-[#E0DDD4] disabled:text-[#A8A5A0] disabled:shadow-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FAF8F2]/30 border-t-[#FAF8F2]" />
                        Verificando...
                      </span>
                    ) : (
                      'Acceder'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#FAF8F2]/40">
            2026 {branding.companyName} - {branding.appName}
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#FAF8F2]/40">
            <ShieldCheck size={11} className="text-[#FFE600]" />
            <span>Conexion cifrada - Acceso seguro</span>
          </div>
          <a
            href={`https://${branding.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-[#FAF8F2]/25 transition-colors hover:text-[#FAF8F2]/50"
          >
            <img src="/branding/q-badge.svg" alt="" className="h-2.5 w-2.5 rounded-[2px] opacity-50" />
            <span>{branding.poweredBy}</span>
          </a>
        </div>
      </div>
    </main>
  );
}
