import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';

interface Method {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  phases: Phase[];
  rounds: number;
  isWimHof?: boolean;
}

interface Phase {
  label: string;
  duration: number; // seconds
  scale: number;
}

const METHODS: Method[] = [
  {
    id: 'box', name: 'Box Breathing', subtitle: '4-4-4-4', description: 'Calm & focus',
    phases: [
      { label: 'INHALE', duration: 4, scale: 1.4 },
      { label: 'HOLD', duration: 4, scale: 1.4 },
      { label: 'EXHALE', duration: 4, scale: 0.8 },
      { label: 'HOLD', duration: 4, scale: 0.8 },
    ],
    rounds: 5,
  },
  {
    id: '478', name: '4-7-8', subtitle: '4-7-8', description: 'Sleep & anxiety',
    phases: [
      { label: 'INHALE', duration: 4, scale: 1.4 },
      { label: 'HOLD', duration: 7, scale: 1.4 },
      { label: 'EXHALE', duration: 8, scale: 0.8 },
    ],
    rounds: 4,
  },
  {
    id: 'wimhof', name: 'Wim Hof', subtitle: '3 rounds', description: 'Energy & cold prep',
    phases: [], rounds: 3, isWimHof: true,
  },
  {
    id: 'sigh', name: 'Physiological Sigh', subtitle: '', description: 'Instant stress relief',
    phases: [
      { label: 'INHALE', duration: 2, scale: 1.2 },
      { label: 'INHALE', duration: 1, scale: 1.4 },
      { label: 'EXHALE', duration: 6, scale: 0.8 },
    ],
    rounds: 5,
  },
  {
    id: 'resonance', name: 'Resonance', subtitle: '5.5s in/out', description: 'HRV & recovery',
    phases: [
      { label: 'INHALE', duration: 5.5, scale: 1.4 },
      { label: 'EXHALE', duration: 5.5, scale: 0.8 },
    ],
    rounds: 6,
  },
  {
    id: 'tactical', name: 'Tactical', subtitle: '4-4-4-4', description: 'Performance focus',
    phases: [
      { label: 'INHALE', duration: 4, scale: 1.4 },
      { label: 'HOLD', duration: 4, scale: 1.4 },
      { label: 'EXHALE', duration: 4, scale: 0.8 },
      { label: 'HOLD', duration: 4, scale: 0.8 },
    ],
    rounds: 5,
  },
];

const BreathworkTab = () => {
  const { user } = useAuth();
  const [active, setActive] = useState<Method | null>(null);

  return (
    <div className="px-4 py-5 pb-24">
      {active ? (
        <GuidedSession method={active} userId={user?.id} onEnd={() => setActive(null)} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m)}
              className="flex flex-col items-start p-4 rounded-[12px] text-left space-y-1"
              style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}
            >
              <span className="font-display text-base tracking-wide" style={{ color: 'hsl(var(--text))' }}>
                {m.name}
              </span>
              {m.subtitle && (
                <span className="font-mono text-[11px]" style={{ color: 'hsl(var(--primary))' }}>
                  {m.subtitle}
                </span>
              )}
              <span className="text-[11px]" style={{ color: 'hsl(var(--dim))' }}>
                {m.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Guided Session
interface GuidedProps {
  method: Method;
  userId?: string;
  onEnd: () => void;
}

const GuidedSession = ({ method, userId, onEnd }: GuidedProps) => {
  const startTime = useRef(Date.now());

  if (method.isWimHof) {
    return <WimHofSession userId={userId} onEnd={onEnd} startTime={startTime} />;
  }

  return <StandardSession method={method} userId={userId} onEnd={onEnd} startTime={startTime} />;
};

const StandardSession = ({ method, userId, onEnd, startTime }: GuidedProps & { startTime: React.MutableRefObject<number> }) => {
  const [round, setRound] = useState(1);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(Math.ceil(method.phases[0].duration));
  const audioCtx = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const phase = method.phases[phaseIdx];

  const playTone = useCallback((freq: number, gain: number) => {
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      // Stop previous
      if (oscRef.current) { try { oscRef.current.stop(); } catch {} }
      
      const osc = audioCtx.current.createOscillator();
      const g = audioCtx.current.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(audioCtx.current.destination);
      osc.start();
      oscRef.current = osc;
      gainRef.current = g;
    } catch {}
  }, []);

  const stopTone = useCallback(() => {
    if (oscRef.current) { try { oscRef.current.stop(); } catch {} oscRef.current = null; }
  }, []);

  useEffect(() => {
    // Play sound based on phase
    if (phase.label === 'INHALE') playTone(440, 0.3);
    else if (phase.label === 'EXHALE') playTone(220, 0.2);
    else stopTone();

    return () => stopTone();
  }, [phaseIdx, round, phase.label, playTone, stopTone]);

  useEffect(() => {
    setCountdown(Math.ceil(phase.duration));
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          // Next phase
          const nextPhase = phaseIdx + 1;
          if (nextPhase >= method.phases.length) {
            if (round >= method.rounds) {
              endSession();
              return 0;
            }
            setRound((r) => r + 1);
            setPhaseIdx(0);
          } else {
            setPhaseIdx(nextPhase);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phaseIdx, round]);

  const endSession = async () => {
    stopTone();
    if (userId) {
      const dur = Math.round((Date.now() - startTime.current) / 1000);
      await supabase.from('breathwork_sessions').insert({
        user_id: userId, method: method.id, duration_secs: dur,
      });
    }
    onEnd();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'hsl(var(--bg))' }}>
      <button onClick={endSession} className="absolute top-4 right-4 p-2">
        <X size={24} style={{ color: 'hsl(var(--dim))' }} />
      </button>

      <h2 className="font-display text-2xl tracking-wide mb-8" style={{ color: 'hsl(var(--text))' }}>
        {method.name}
      </h2>

      {/* Breathing circle */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        <div
          className="w-full h-full rounded-full transition-transform duration-1000 ease-in-out"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary)), hsla(var(--primary), 0.3))`,
            transform: `scale(${phase.scale})`,
            boxShadow: '0 0 30px hsla(192,91%,54%,0.4)',
          }}
        />
      </div>

      <span className="font-display text-[32px]" style={{ color: 'hsl(var(--text))' }}>
        {phase.label}
      </span>

      <span className="font-mono text-4xl mt-2" style={{ color: 'hsl(var(--primary))' }}>
        {countdown}
      </span>

      <span className="text-sm mt-6" style={{ color: 'hsl(var(--dim))' }}>
        Round {round} of {method.rounds}
      </span>

      <button
        onClick={endSession}
        className="mt-10 px-8 py-3 rounded-[12px] text-sm font-semibold"
        style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
      >
        End Session
      </button>
    </div>
  );
};

// Wim Hof
const WimHofSession = ({ userId, onEnd, startTime }: { userId?: string; onEnd: () => void; startTime: React.MutableRefObject<number> }) => {
  const [round, setRound] = useState(1);
  const [stage, setStage] = useState<'breathing' | 'hold' | 'recovery' | 'done'>('breathing');
  const [breathCount, setBreatheCount] = useState(0);
  const [holdTimer, setHoldTimer] = useState(0);
  const [holdTimes, setHoldTimes] = useState<number[]>([]);
  const [recoveryCountdown, setRecoveryCountdown] = useState(15);
  const holdInterval = useRef<ReturnType<typeof setInterval>>();

  // Breathing phase: 30 rapid breaths
  useEffect(() => {
    if (stage !== 'breathing') return;
    setBreatheCount(0);
    const interval = setInterval(() => {
      setBreatheCount((c) => {
        if (c >= 29) {
          clearInterval(interval);
          setStage('hold');
          return 30;
        }
        return c + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, round]);

  // Hold phase: timer counting up
  useEffect(() => {
    if (stage !== 'hold') return;
    setHoldTimer(0);
    holdInterval.current = setInterval(() => {
      setHoldTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(holdInterval.current);
  }, [stage]);

  const tapDone = () => {
    clearInterval(holdInterval.current);
    setHoldTimes((prev) => [...prev, holdTimer]);
    setStage('recovery');
  };

  // Recovery phase
  useEffect(() => {
    if (stage !== 'recovery') return;
    setRecoveryCountdown(15);
    const interval = setInterval(() => {
      setRecoveryCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          if (round >= 3) {
            setStage('done');
          } else {
            setRound((r) => r + 1);
            setStage('breathing');
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, round]);

  const finish = async () => {
    if (userId) {
      const dur = Math.round((Date.now() - startTime.current) / 1000);
      await supabase.from('breathwork_sessions').insert({
        user_id: userId, method: 'wimhof', duration_secs: dur,
      });
    }
    onEnd();
  };

  const circleScale = stage === 'breathing' ? (breathCount % 2 === 0 ? 1.4 : 0.8)
    : stage === 'hold' ? 1.0 : 1.2;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{ background: 'hsl(var(--bg))' }}>
      <button onClick={finish} className="absolute top-4 right-4 p-2">
        <X size={24} style={{ color: 'hsl(var(--dim))' }} />
      </button>

      <h2 className="font-display text-2xl tracking-wide mb-6" style={{ color: 'hsl(var(--text))' }}>
        Wim Hof
      </h2>

      {stage === 'done' ? (
        <div className="space-y-4 text-center">
          <span className="font-display text-xl" style={{ color: 'hsl(var(--text))' }}>Complete!</span>
          <div className="space-y-2">
            {holdTimes.map((t, i) => (
              <div key={i} className="font-mono text-lg" style={{ color: 'hsl(var(--primary))' }}>
                Round {i + 1}: {t}s
              </div>
            ))}
          </div>
          <button onClick={finish} className="mt-6 px-8 py-3 rounded-[12px] text-sm font-semibold"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-40 h-40 flex items-center justify-center mb-8">
            <div
              className="w-full h-full rounded-full transition-transform duration-500 ease-in-out"
              style={{
                background: `radial-gradient(circle, hsl(var(--primary)), hsla(var(--primary), 0.3))`,
                transform: `scale(${circleScale})`,
                boxShadow: '0 0 30px hsla(192,91%,54%,0.4)',
              }}
            />
          </div>

          {stage === 'breathing' && (
            <>
              <span className="font-display text-[32px]" style={{ color: 'hsl(var(--text))' }}>
                {breathCount % 2 === 0 ? 'INHALE' : 'EXHALE'}
              </span>
              <span className="font-mono text-2xl mt-2" style={{ color: 'hsl(var(--primary))' }}>
                {breathCount + 1} / 30
              </span>
            </>
          )}

          {stage === 'hold' && (
            <>
              <span className="font-display text-[32px]" style={{ color: 'hsl(var(--text))' }}>
                HOLD
              </span>
              <span className="font-mono text-4xl mt-2" style={{ color: 'hsl(var(--primary))' }}>
                {holdTimer}s
              </span>
              <button onClick={tapDone} className="mt-8 px-8 py-4 rounded-[12px] text-base font-semibold"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                Tap When Done
              </button>
            </>
          )}

          {stage === 'recovery' && (
            <>
              <span className="font-display text-[24px] text-center" style={{ color: 'hsl(var(--text))' }}>
                INHALE FULLY<br />HOLD 15 SECONDS
              </span>
              <span className="font-mono text-4xl mt-2" style={{ color: 'hsl(var(--primary))' }}>
                {recoveryCountdown}
              </span>
            </>
          )}

          <span className="text-sm mt-6" style={{ color: 'hsl(var(--dim))' }}>
            Round {round} of 3
          </span>

          <button onClick={finish} className="mt-8 px-8 py-3 rounded-[12px] text-sm font-semibold"
            style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}>
            End Session
          </button>
        </>
      )}
    </div>
  );
};

export default BreathworkTab;
