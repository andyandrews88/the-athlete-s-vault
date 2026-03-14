import { useState, useEffect, useRef, useCallback } from 'react';
import { X, SkipForward } from 'lucide-react';

interface RestTimerProps {
  durationSecs: number;
  onComplete: () => void;
  onSkip: () => void;
}

export const RestTimer = ({ durationSecs, onComplete, onSkip }: RestTimerProps) => {
  const [remaining, setRemaining] = useState(durationSecs);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
    try { navigator.vibrate?.(200); } catch {}
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      playBeep();
      onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onComplete, playBeep]);

  const pct = ((durationSecs - remaining) / durationSecs) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-lg" style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.15)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Rest Timer</span>
          <button onClick={onSkip} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-3xl text-primary font-bold">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary transition-colors"
          >
            <SkipForward size={12} /> Skip
          </button>
        </div>
        <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
