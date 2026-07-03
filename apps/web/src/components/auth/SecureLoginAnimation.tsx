'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Lock,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { BrandMark } from '@/components/branding/brand-mark';
import { branding } from '@/lib/branding';

type SecureLoginAnimationProps = {
  userName?: string;
  tenantName?: string;
  onComplete: () => void;
};

const steps = [
  { label: 'Verificando enlace seguro', icon: Shield },
  { label: 'Validando identidad', icon: Fingerprint },
  { label: 'Preparando sesion protegida', icon: Lock },
  { label: 'Cifrando comunicacion', icon: KeyRound },
  { label: 'Aplicando permisos del club', icon: ShieldCheck },
  { label: 'Acceso concedido', icon: CheckCircle2 },
];

const STEP_DURATION = 450;

export function SecureLoginAnimation({
  userName,
  tenantName,
  onComplete,
}: SecureLoginAnimationProps) {
  const [activeStep, setActiveStep] = useState(-1);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setActiveStep(0), 200));

    steps.forEach((_, index) => {
      if (index > 0) {
        timers.push(
          window.setTimeout(() => setActiveStep(index), 200 + index * STEP_DURATION),
        );
      }
    });

    const exitTime = 200 + steps.length * STEP_DURATION + 400;
    timers.push(window.setTimeout(() => setExiting(true), exitTime));
    timers.push(window.setTimeout(onComplete, exitTime + 500));

    return () => timers.forEach(window.clearTimeout);
  }, [onComplete]);

  const progress = useMemo(
    () => (activeStep < 0 ? 0 : Math.round(((activeStep + 1) / steps.length) * 100)),
    [activeStep],
  );

  const isComplete = activeStep >= steps.length - 1;

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-[#15140F] px-4 transition-opacity duration-500 ${
        exiting ? 'opacity-0 scale-105' : 'opacity-100'
      }`}
      style={{ transition: 'opacity 0.5s ease, transform 0.5s ease' }}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="login-orb-1 absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#166534]/10 blur-3xl" />
      <div className="login-orb-2 absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#14532D]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative">
            <div
              className={`absolute -inset-4 rounded-3xl transition-all duration-1000 ${
                isComplete
                  ? 'bg-[#166534]/20 shadow-[0_0_60px_rgba(250,204,21,0.28)]'
                  : 'bg-[#166534]/10 shadow-[0_0_30px_rgba(250,204,21,0.18)]'
              }`}
              style={{ animation: 'login-glow 3s ease-in-out infinite' }}
            />
            <div className="absolute -inset-2 overflow-hidden rounded-2xl">
              <div
                className="h-full w-full rounded-2xl"
                style={{
                  background: `conic-gradient(from 0deg, transparent, rgba(250,204,21,${isComplete ? '0.5' : '0.25'}), transparent)`,
                  animation: 'spin 3s linear infinite',
                }}
              />
            </div>
            <div
              className={`relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-xl transition-all duration-500 ${
                isComplete
                  ? 'from-green-600 to-green-700 shadow-green-400/25'
                  : 'from-green-600 to-green-700 shadow-green-400/20'
              }`}
              style={{ animation: 'login-logo-bounce 0.6s ease-out both' }}
            >
              {isComplete ? (
                <CheckCircle2 size={36} strokeWidth={2.5} className="animate-[login-logo-bounce_0.4s_ease-out]" />
              ) : (
                <BrandMark variant="yellow" size={36} className="h-9 w-9" />
              )}
            </div>
          </div>

          <h1
            className="mt-6 text-2xl font-bold tracking-tight text-white"
            style={{ animation: 'login-fade-up 0.5s ease-out 0.2s both' }}
          >
            {isComplete ? `Bienvenido a ${branding.appName}` : 'Acceso seguro'}
          </h1>
          <p
            className="mt-1 text-sm text-slate-400"
            style={{ animation: 'login-fade-up 0.5s ease-out 0.3s both' }}
          >
            {isComplete
              ? 'Tu sesion esta lista'
              : 'Preparando una sesion protegida para tu panel'}
          </p>
          {(userName || tenantName) ? (
            <p
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300"
              style={{ animation: 'login-fade-up 0.5s ease-out 0.4s both' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#166534]" />
              {userName ?? 'Usuario'} · {tenantName ?? branding.appName}
            </p>
          ) : null}
        </div>

        <div
          className="mb-6 overflow-hidden rounded-full bg-white/5"
          style={{ animation: 'login-fade-up 0.5s ease-out 0.35s both' }}
        >
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-green-600 to-green-700 transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              boxShadow: '0 0 12px rgba(250,204,21,0.45)',
            }}
          />
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const state = index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending';

            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-400 ${
                  state === 'done'
                    ? 'border-[#86EFAC]/30 bg-[#166534]/10'
                    : state === 'active'
                      ? 'border-[#86EFAC]/40 bg-[#166534]/15 shadow-sm shadow-green-400/10'
                      : 'border-white/5 bg-white/[0.03]'
                }`}
                style={{
                  opacity: state === 'pending' ? 0.4 : 1,
                  transform: state === 'active' ? 'scale(1.01)' : 'scale(1)',
                  animation: `login-fade-up 0.3s ease-out ${0.4 + index * 0.06}s both`,
                  transition: 'opacity 0.4s, transform 0.3s, background-color 0.4s, border-color 0.4s',
                }}
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-400 ${
                    state === 'done'
                      ? 'bg-[#166534]/20 text-[#14532D]'
                      : state === 'active'
                        ? 'bg-[#166534]/20 text-[#166534]'
                        : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {state === 'done' ? (
                    <CheckCircle2 size={16} />
                  ) : state === 'active' ? (
                    <div className="relative">
                      <Icon size={16} />
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#166534] shadow-sm shadow-green-400/50" style={{ animation: 'login-glow 1.5s ease-in-out infinite' }} />
                    </div>
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                <span
                  className={`text-sm font-medium transition-colors duration-400 ${
                    state === 'done'
                      ? 'text-[#166534]'
                      : state === 'active'
                        ? 'text-white'
                        : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
                {state === 'active' ? (
                  <div className="ml-auto flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-[#166534]" style={{ animation: 'bounce 1s infinite 0ms' }} />
                    <span className="h-1 w-1 rounded-full bg-[#166534]" style={{ animation: 'bounce 1s infinite 150ms' }} />
                    <span className="h-1 w-1 rounded-full bg-[#166534]" style={{ animation: 'bounce 1s infinite 300ms' }} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

