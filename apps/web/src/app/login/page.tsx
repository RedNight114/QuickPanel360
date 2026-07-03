'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { BrandMark } from '@/components/branding/brand-mark';
import { SecureLoginAnimation } from '@/components/auth/SecureLoginAnimation';
import { Button } from '@/components/ui/button';
import { branding } from '@/lib/branding';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login, accessLinkToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpDigits, setTotpDigits] = useState(['', '', '', '', '', '']);
  const totpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [secureRedirect, setSecureRedirect] = useState<{
    path: string;
    userName?: string;
    tenantName?: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'session-expired') {
      setError('Tu sesion ha caducado. Inicia sesion de nuevo.');
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const totpCode = totpRequired ? totpDigits.join('') : undefined;
      const response = await login(email, password, accessLinkToken, totpCode);

      if (response.requiresTotp) {
        setTotpRequired(true);
        setTimeout(() => totpRefs.current[0]?.focus(), 100);
        return;
      }

      setSecureRedirect({
        path: response.user.role === 'SUPERADMIN' ? '/platform' : response.user.role === 'EMPLOYEE' ? '/pos' : '/dashboard',
        userName: response.user.name,
        tenantName: response.tenant.name,
      });
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo iniciar sesion');
      if (message.toLowerCase().includes('modo emergencia')) { router.replace('/emergency-locked'); return; }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function onTotpDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...totpDigits];
    next[index] = digit;
    setTotpDigits(next);
    if (digit && index < 5) totpRefs.current[index + 1]?.focus();
    // Auto-submit when all 6 digits filled
    if (next.every((d) => d !== '') && digit) {
      const form = totpRefs.current[0]?.closest('form');
      form?.requestSubmit();
    }
  }

  function onTotpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !totpDigits[index] && index > 0) {
      totpRefs.current[index - 1]?.focus();
    }
  }

  if (secureRedirect) {
    return <SecureLoginAnimation userName={secureRedirect.userName} tenantName={secureRedirect.tenantName} onComplete={() => router.replace(secureRedirect.path)} />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#15140F] px-4 py-8">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
      />
      <div className="login-orb-1 absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#FFE600]/8 blur-3xl" />
      <div className="login-orb-2 absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#FFE600]/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="login-logo mb-5 inline-flex items-center justify-center">
            <div className="login-float login-glow relative">
              <BrandMark variant="badge" size={64} className="h-16 w-16 rounded-2xl shadow-lg shadow-[#FFE600]/20" />
              <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[#FAF8F2] shadow-sm">
                <ShieldCheck size={14} className="text-[#15140F]" />
              </div>
            </div>
          </div>
          <h1 className="login-title text-3xl font-bold tracking-tight text-[#FAF8F2]">{branding.appName}</h1>
          <p className="login-subtitle mt-1.5 text-sm text-[#FAF8F2]/60">{branding.tagline}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.24em] text-[#FFE600]">
            by {branding.companyName}
          </p>
        </div>

        <div className="login-card rounded-2xl border border-[#FAF8F2]/10 bg-[#FAF8F2]/5 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="rounded-xl bg-[#FAF8F2] p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-[#15140F]">Iniciar sesion</h2>
              <p className="mt-0.5 text-sm text-[#7A7770]">Introduce tus credenciales para acceder</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              {totpRequired && (
                <div className="flex flex-col gap-3 rounded-xl border border-[#E0DDD4] bg-[#FAF8F2] p-4">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-[#15140F]" />
                    <p className="text-sm font-semibold text-[#15140F]">Verificación en dos pasos</p>
                  </div>
                  <p className="text-xs text-[#7A7770]">Introduce el código de 6 dígitos de tu app de autenticación</p>
                  <div className="flex justify-center gap-2">
                    {totpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { totpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => onTotpDigit(i, e.target.value)}
                        onKeyDown={(e) => onTotpKeyDown(i, e)}
                        className="h-12 w-10 rounded-xl border border-[#E0DDD4] bg-white text-center text-lg font-bold text-[#15140F] outline-none focus:border-[#15140F] focus:ring-2 focus:ring-[#FFE600]/30"
                      />
                    ))}
                  </div>
                  <button type="button" onClick={() => { setTotpRequired(false); setTotpDigits(['','','','','','']); setError(null); }} className="text-center text-xs text-[#7A7770] underline">
                    Volver al inicio de sesión
                  </button>
                </div>
              )}

              {!totpRequired && (<>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#15140F]">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-[#A8A5A0]" />
                  <input type="email" autoComplete="email" placeholder="correo@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="h-12 w-full rounded-xl border border-[#E0DDD4] bg-[#F2EFE6] pl-10 pr-4 text-sm text-[#15140F] outline-none transition placeholder:text-[#A8A5A0] focus:border-[#15140F] focus:bg-white focus:ring-4 focus:ring-[#FFE600]/20" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#15140F]">Contrasena</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-[#A8A5A0]" />
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="h-12 w-full rounded-xl border border-[#E0DDD4] bg-[#F2EFE6] pl-10 pr-12 text-sm text-[#15140F] outline-none transition placeholder:text-[#A8A5A0] focus:border-[#15140F] focus:bg-white focus:ring-4 focus:ring-[#FFE600]/20" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-3 rounded-md p-0.5 text-[#A8A5A0] transition hover:text-[#15140F]" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              </>)}

              {accessLinkToken ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <ShieldCheck size={18} className="shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Enlace seguro verificado</p>
                    <p className="text-xs text-green-600">Este dispositivo esta autorizado.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle size={18} className="shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Sin enlace de seguridad</p>
                    <p className="text-xs text-amber-600">En produccion necesitaras un enlace seguro.</p>
                  </div>
                </div>
              )}

              {error ? (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <Button type="submit" size="lg" disabled={loading || (!totpRequired && (!email || !password)) || (totpRequired && totpDigits.some((d) => !d))}
                className="h-12 w-full rounded-xl bg-[#15140F] text-sm font-semibold text-[#FAF8F2] shadow-md transition-all hover:bg-[#2A2820] disabled:bg-[#E0DDD4] disabled:text-[#A8A5A0] disabled:shadow-none">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FAF8F2]/30 border-t-[#FAF8F2]" />
                    Verificando...
                  </span>
                ) : 'Iniciar sesion'}
              </Button>
            </form>
          </div>
        </div>

        <div className="login-footer mt-8 text-center">
          <p className="text-xs text-[#FAF8F2]/40">2026 {branding.companyName} - {branding.appName}</p>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#FAF8F2]/40">
            <ShieldCheck size={11} className="text-[#FFE600]" />
            <span>Conexion cifrada - Sesiones seguras - Auditoria activa</span>
          </div>
          <a href={`https://${branding.website}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-[#FAF8F2]/25 transition-colors hover:text-[#FAF8F2]/50">
            <BrandMark variant="badge" size={10} className="h-2.5 w-2.5 rounded-[2px] opacity-50" />
            <span>{branding.poweredBy}</span>
          </a>
        </div>
      </div>
    </main>
  );
}
