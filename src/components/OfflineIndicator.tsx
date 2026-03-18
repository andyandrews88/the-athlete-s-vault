import { useState, useEffect } from 'react';

const OfflineIndicator = () => {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setHiding(false); };
    const goOnline = () => {
      setHiding(true);
      setTimeout(() => { setOffline(false); setHiding(false); }, 2000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] text-center py-1.5 font-mono text-[10px] transition-opacity duration-500"
      style={{
        background: 'hsl(var(--warn) / 0.1)',
        borderBottom: '1px solid hsl(var(--warn) / 0.2)',
        color: 'hsl(var(--warn))',
        opacity: hiding ? 0 : 1,
      }}
    >
      You're offline — some features may be unavailable
    </div>
  );
};

export default OfflineIndicator;