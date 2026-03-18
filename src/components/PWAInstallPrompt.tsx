import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('vault_install_dismissed') || localStorage.getItem('vault_installed')) return;

    const count = parseInt(localStorage.getItem('vault_visit_count') || '0', 10) + 1;
    localStorage.setItem('vault_visit_count', String(count));

    if (count < 3) return;

    if (isIOS()) {
      const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
      if (!isStandalone) setShowIOS(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('vault_installed', 'true');
    }
    setShow(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismissForever = useCallback(() => {
    localStorage.setItem('vault_install_dismissed', 'true');
    setShow(false);
    setShowIOS(false);
    setDismissed(true);
  }, []);

  const handleNotNow = useCallback(() => {
    setShow(false);
    setShowIOS(false);
    setDismissed(true);
  }, []);

  if (dismissed) return null;
  if (!show && !showIOS) return null;

  return (
    <div
      className="fixed z-[90] left-4 right-4 animate-fade-in"
      style={{ bottom: 68 }}
    >
      <div
        className="rounded-xl p-3.5 px-4"
        style={{
          background: 'hsl(var(--bg2))',
          border: '1px solid hsla(192,91%,54%,0.2)',
          boxShadow: '0 -4px 20px hsla(0,0%,0%,0.4)',
        }}
      >
        {/* Row 1 */}
        <div className="flex items-center gap-3">
          <span className="font-display text-sm tracking-wide" style={{ color: 'hsl(var(--primary))' }}>
            THE VAULT
          </span>
          <span className="flex-1 text-xs font-semibold" style={{ color: 'hsl(var(--text))' }}>
            Add to Home Screen
          </span>
          <button onClick={handleDismissForever} className="p-1">
            <X size={14} style={{ color: 'hsl(var(--dim))' }} />
          </button>
        </div>

        {/* Row 2 */}
        <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--dim))' }}>
          {showIOS
            ? 'Tap the Share button ↑ then "Add to Home Screen"'
            : 'Get the full app experience — works offline, faster, no browser bar'}
        </p>

        {/* Row 3 */}
        {!showIOS && (
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleInstall}
              className="text-[11px] font-bold px-5 py-2 rounded-lg transition-all active:scale-95"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(220,16%,6%)',
              }}
            >
              Install App
            </button>
            <button
              onClick={handleNotNow}
              className="text-[10px]"
              style={{ color: 'hsl(var(--dim))' }}
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;