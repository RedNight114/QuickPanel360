'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa:install-dismissed';

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-[#FFE600]/30 bg-[#15140F] px-4 py-3 shadow-xl">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE600]">
        <Download size={16} className="text-[#15140F]" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#FAF8F2]">Instalar app del club</p>
        <p className="text-[10px] text-[#7A7770]">Accede sin conexión y más rápido</p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-lg bg-[#FFE600] px-3 py-1.5 text-xs font-bold text-[#15140F] transition active:scale-95"
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1.5 text-[#7A7770] transition hover:text-[#FAF8F2]"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
