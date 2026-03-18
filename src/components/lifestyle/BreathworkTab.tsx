import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Method {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  phases: Phase[];
  rounds: number;
  isWimHof?: boolean;
  emoji: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
}

interface Phase {
  label: string;
  duration: number;
  scale: number;
}

const METHODS: Method[] = [
  {
    id: 'box', name: 'Box Breathing', subtitle: '4-4-4-4 · Focus · 5 rounds',
    description: 'Calm & focus', emoji: '⬜',
    badge: 'FOCUS', badgeBg: 'hsla(192,91%,54%,0.1)', badgeColor: 'hsl(var(--primary))',
    phases: [
      { label: 'INHALE', duration: 4, scale: 1.4 },
      { label: 'HOLD', duration: 4, scale: 1.4 },
      { label: 'EXHALE', duration: 4, scale: 0.8 },
      { label: 'HOLD', duration: 4, scale: 0.8 },
    ],
    rounds: 5,
  },
  {
    id: '478', name: '4-7-8', subtitle: '4-7-8 · Sleep · 4 rounds',
    description: 'Sleep & anxiety', emoji: '🌙',
    badge: 'SLEEP', badgeBg: 'hsla(262,60%,55%,0.1)', badgeColor: 'hsl(262,60%,70%)',
    phases: [
      { label: 'INHALE', duration: 4, scale: 1.4 },
      { label: 'HOLD', duration: 7, scale: 1.4 },
      { label: 'EXHALE', duration: 8, scale: 0.8 },
    ],
    rounds: 4,
  },
  {
    id: 'wimhof', name: 'Wim Hof', subtitle: '30 breaths · 3 rounds',
    description: 'Energy & cold prep', emoji: '❄️',
    badge: 'ACTIVTN', badgeBg: 'hsla(45,93%,58%,0.1)', badgeColor: 'hsl(var(--gold))',
    phases: [], rounds: 3, isWimHof: true,
  },
  {
    id: 'sigh', name: 'Cyclic Sighing', subtitle: '2-1-6 · Calm · 5 rounds',
    description: 'Instant stress relief', emoji: '🌊',
    badge: 'CALM', badgeBg: 'hsla(142,71%,45%,0.1)', badgeColor: 'hsl(var(--ok))',
    phases: [
      { label: 'INHALE', duration: 2, scale: 1.2 },
      { label: 'INHALE', duration: 1, scale: 1.4 },
      { label: 'EXHALE', duration: 6, scale: 0.8 },
    ],
    rounds: 5,
  },
  {
    id: 'resonance', name: 'Physiological Sigh', subtitle: '5.5s in/out · 6 rounds',
    description: 'HRV & recovery', emoji: '🐢',
    badge: 'RELAX', badgeBg: 'hsla(142,71%,45%,0.1)', badgeColor: 'hsl(var(--ok))',
    phases: [
      { label: 'INHALE', duration: 5.5, scale: 1.4 },
      { label: 'EXHALE', duration: 5.5, scale: 0.8 },
    ],
    rounds: 6,
  },
  {
    id: 'tactical', name: 'Alternate Nostril', subtitle: '4-4-4-4 · Balance · 5 rounds',
    description: 'Performance focus', emoji: '🧘',
    badge: 'BALANCE', badgeBg: 'hsla(38,92%,50%,0.1)', badgeColor: 'hsl(var(--warn))',
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
        <div className="space-y-0">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m)}
              className="w-full text-left"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'hsl(var(--bg2))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 10,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 }}>
                {m.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>
                  {m.name}
                </div>
                <div className="font-mono" style={{ fontSize: 9, color: 'hsl(var(--dim))' }}>
                  {m.subtitle}
                </div>
              </div>
              <span
                className="font-mono"
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: m.badgeBg,
                  color: m.badgeColor,
                  flexShrink: 0,
                  letterSpacing: '0.05em',
                }}
              >
                {m.badge}
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

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const StandardSession = ({ method, userId, onEnd, startTime }: GuidedProps & { startTime: React.MutableRefObject<number> }) => {
  const [round, setRound] = useState(1);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(Math.ceil(method.phases[0].duration));
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const phase = method.phases[phaseIdx];
  const totalPhaseTime = Math.ceil(phase.duration);
  const phaseProgress = (totalPhaseTime - countdown) / totalPhaseTime;

  // Total progress
  const totalPhasesCount = method.phases.length * method.rounds;
  const completedPhases = (round - 1) * method.phases.length + phaseIdx;
  const overallProgress = (completedPhases + phaseProgress) / totalPhasesCount;

  // SVG circle
  const circleRadius = 62;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeOffset = circumference - phaseProgress * circumference;

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused) setElapsed(Math.round((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, startTime]);

  const playTone = useCallback((freq: number, gain: number) => {
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      if (oscRef.current) { try { oscRef.current.stop(); } catch {} }
      const osc = audioCtx.current.createOscillator();
      const g = audioCtx.current.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(audioCtx.current.destination);
      osc.start();
      oscRef.current = osc;
    } catch {}
  }, []);

  const stopTone = useCallback(() => {
    if (oscRef.current) { try { oscRef.current.stop(); } catch {} oscRef.current = null; }
  }, []);

  useEffect(() => {
    if (paused) { stopTone(); return; }
    if (phase.label === 'INHALE') playTone(440, 0.3);
    else if (phase.label === 'EXHALE') playTone(220, 0.2);
    else stopTone();
    return () => stopTone();
  }, [phaseIdx, round, phase.label, playTone, stopTone, paused]);

  useEffect(() => {
    if (paused) return;
    setCountdown(Math.ceil(phase.duration));
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
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
  }, [phaseIdx, round, paused]);

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

  const phaseInstruction = phase.label === 'INHALE'
    ? 'Breathe in slowly through your nose'
    : phase.label === 'EXHALE'
      ? 'Breathe out slowly through your mouth'
      : 'Hold your breath gently';

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, hsla(192,91%,54%,0.08), hsl(var(--bg)) 65%)',
        padding: 16,
      }}
    >
      {/* Top row */}
      <div className="w-full flex items-center justify-between" style={{ marginBottom: 8 }}>
        <button onClick={endSession} style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>← Back</button>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'hsl(var(--text))' }}>{method.name}</span>
        <span style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>🔊</span>
      </div>

      {/* Round indicator */}
      <div className="font-mono" style={{ fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 12, letterSpacing: '0.1em' }}>
        ROUND {round} OF {method.rounds}
      </div>

      {/* SVG Circle */}
      <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 16 }}>
        <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={70} cy={70} r={circleRadius} fill="none" strokeWidth={6} stroke="rgba(255,255,255,0.03)" />
          <circle
            cx={70} cy={70} r={circleRadius} fill="none" strokeWidth={6}
            stroke="hsl(192,91%,54%)"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="font-display" style={{ fontSize: 36, letterSpacing: 3, color: 'hsl(var(--primary))', lineHeight: 1 }}>
            {phase.label}
          </span>
          <span className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text))', marginTop: 4 }}>
            {countdown}
          </span>
          <span style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>seconds</span>
        </div>
      </div>

      {/* Phase indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${method.phases.length}, 1fr)`, gap: 8, marginBottom: 20, width: '100%', maxWidth: 280 }}>
        {method.phases.map((p, i) => {
          const isCompleted = i < phaseIdx || (i === phaseIdx && countdown === 0);
          const isCurrent = i === phaseIdx && countdown > 0;
          const color = isCompleted ? 'hsl(var(--ok))' : isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--dim))';
          const suffix = isCompleted ? ' ✓' : isCurrent ? ' ▶' : '';
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 7, color }}>{p.label}</div>
              <div className="font-mono" style={{ fontSize: 9, color }}>{p.duration}s{suffix}</div>
            </div>
          );
        })}
      </div>

      {/* Instruction */}
      <div style={{ fontSize: 9, color: 'hsl(var(--mid))', textAlign: 'center', marginBottom: 14 }}>
        {phaseInstruction}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 2, background: 'hsl(var(--bg4))', borderRadius: 2, marginBottom: 14 }}>
        <div style={{ width: `${overallProgress * 100}%`, height: '100%', background: 'hsl(var(--primary))', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button
          onClick={() => setPaused(!paused)}
          style={{
            flex: 1, padding: 8, textAlign: 'center', fontSize: 9,
            background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
            borderRadius: 8, color: 'hsl(var(--dim))',
          }}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          onClick={endSession}
          style={{
            flex: 1, padding: 8, textAlign: 'center', fontSize: 9, fontWeight: 600,
            background: 'hsl(var(--bad))', borderRadius: 8, color: 'white', border: 'none',
          }}
        >
          ✕ End
        </button>
      </div>

      {/* Total time */}
      <div className="font-mono" style={{ fontSize: 8, color: 'hsl(var(--dim))', marginTop: 9 }}>
        Total: {formatTime(elapsed)}
      </div>
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
  const [elapsed, setElapsed] = useState(0);
  const holdInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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

  const phaseLabel = stage === 'breathing'
    ? (breathCount % 2 === 0 ? 'INHALE' : 'EXHALE')
    : stage === 'hold' ? 'HOLD' : stage === 'recovery' ? 'RECOVER' : 'DONE';

  // Progress for SVG circle
  const circleRadius = 62;
  const circumference = 2 * Math.PI * circleRadius;
  let phaseProgress = 0;
  if (stage === 'breathing') phaseProgress = breathCount / 30;
  else if (stage === 'recovery') phaseProgress = (15 - recoveryCountdown) / 15;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, hsla(192,91%,54%,0.08), hsl(var(--bg)) 65%)',
        padding: 16,
      }}
    >
      {/* Top row */}
      <div className="w-full flex items-center justify-between" style={{ marginBottom: 8 }}>
        <button onClick={finish} style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>← Back</button>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'hsl(var(--text))' }}>Wim Hof</span>
        <span style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>🔊</span>
      </div>

      {/* Round indicator */}
      <div className="font-mono" style={{ fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 12, letterSpacing: '0.1em' }}>
        ROUND {round} OF 3
      </div>

      {stage === 'done' ? (
        <div className="flex flex-col items-center" style={{ marginTop: 20 }}>
          <span className="font-display" style={{ fontSize: 36, color: 'hsl(var(--primary))', marginBottom: 16 }}>COMPLETE</span>
          <div className="space-y-2" style={{ marginBottom: 20 }}>
            {holdTimes.map((t, i) => (
              <div key={i} className="font-mono" style={{ fontSize: 14, color: 'hsl(var(--primary))', textAlign: 'center' }}>
                Round {i + 1}: {t}s
              </div>
            ))}
          </div>
          <button onClick={finish} style={{
            padding: '8px 32px', borderRadius: 8, fontSize: 9, fontWeight: 600,
            background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
          }}>
            Done
          </button>
        </div>
      ) : (
        <>
          {/* SVG Circle */}
          <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 16 }}>
            <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={70} cy={70} r={circleRadius} fill="none" strokeWidth={6} stroke="rgba(255,255,255,0.03)" />
              <circle
                cx={70} cy={70} r={circleRadius} fill="none" strokeWidth={6}
                stroke="hsl(192,91%,54%)"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - phaseProgress * circumference}
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="font-display" style={{ fontSize: 36, letterSpacing: 3, color: 'hsl(var(--primary))', lineHeight: 1 }}>
                {phaseLabel}
              </span>
              <span className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text))', marginTop: 4 }}>
                {stage === 'breathing' ? `${breathCount + 1}/30` : stage === 'hold' ? `${holdTimer}s` : `${recoveryCountdown}`}
              </span>
              <span style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>
                {stage === 'breathing' ? 'breaths' : 'seconds'}
              </span>
            </div>
          </div>

          {/* Instruction */}
          <div style={{ fontSize: 9, color: 'hsl(var(--mid))', textAlign: 'center', marginBottom: 14 }}>
            {stage === 'breathing' ? 'Deep rapid breaths — in through nose, out through mouth'
              : stage === 'hold' ? 'Hold after exhale — tap when you need to breathe'
                : 'Inhale fully and hold for 15 seconds'}
          </div>

          {/* Hold tap button */}
          {stage === 'hold' && (
            <button
              onClick={tapDone}
              style={{
                padding: '8px 32px', borderRadius: 8, fontSize: 9, fontWeight: 600,
                background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
                marginBottom: 14, border: 'none',
              }}
            >
              Tap When Done
            </button>
          )}

          {/* Progress bar */}
          <div style={{ width: '100%', height: 2, background: 'hsl(var(--bg4))', borderRadius: 2, marginBottom: 14 }}>
            <div style={{
              width: `${((round - 1) / 3 + phaseProgress / 3) * 100}%`,
              height: '100%', background: 'hsl(var(--primary))', borderRadius: 2, transition: 'width 0.3s ease',
            }} />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <div style={{
              flex: 1, padding: 8, textAlign: 'center', fontSize: 9,
              background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
              borderRadius: 8, color: 'hsl(var(--dim))',
            }} />
            <button
              onClick={finish}
              style={{
                flex: 1, padding: 8, textAlign: 'center', fontSize: 9, fontWeight: 600,
                background: 'hsl(var(--bad))', borderRadius: 8, color: 'white', border: 'none',
              }}
            >
              ✕ End
            </button>
          </div>

          {/* Total time */}
          <div className="font-mono" style={{ fontSize: 8, color: 'hsl(var(--dim))', marginTop: 9 }}>
            Total: {formatTime(elapsed)}
          </div>
        </>
      )}
    </div>
  );
};

export default BreathworkTab;