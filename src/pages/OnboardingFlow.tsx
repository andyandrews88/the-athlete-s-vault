import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo.png';

const TOTAL_SCREENS = 4;

const beliefs = [
  { key: 'health', emoji: '❤️', label: 'Health', desc: 'Without health, nothing else matters. Sleep, stress, recovery — these are the foundation. If the base is broken, performance and aesthetics will always be limited.' },
  { key: 'performance', emoji: '⚡', label: 'Performance', desc: 'Train to perform. Strength, conditioning, mobility — chase capacity, not just appearance. When you perform better, everything else follows.' },
  { key: 'aesthetics', emoji: '✨', label: 'Aesthetics', desc: 'Looking good is a byproduct of doing things right. Body composition changes when training, nutrition, and recovery are dialled in together.' },
] as const;

const features = [
  { emoji: '🏋️', title: 'Training tracked the right way', sub: 'Patterns, volume, intensity, PRs' },
  { emoji: '🥗', title: 'Nutrition that travels with you', sub: 'Hand portions or full macro tracking' },
  { emoji: '📚', title: 'Knowledge you can trust', sub: 'Curated by a coach, free forever' },
  { emoji: '🤖', title: 'A coach in your pocket', sub: 'AI that knows your data, speaks in Andy\'s voice' },
];

const checkmarks = [
  'Strength & engine assessment',
  'Movement screen',
  'Lifestyle & recovery snapshot',
  'Personalised score & tier',
];

const ProgressDots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2 pb-6 pt-4">
    {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-300 ${
          i <= current
            ? 'w-4 h-1.5 bg-primary'
            : 'w-1.5 h-1.5 bg-vault-border2'
        }`}
      />
    ))}
  </div>
);

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, profile, refetchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedBelief, setSelectedBelief] = useState('performance');

  const saveAndFinish = async (goTo: string) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user.id);
    refetchProfile?.();
    navigate(goTo);
  };

  const next = () => setStep((s) => s + 1);

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col relative overflow-hidden">
      {/* Scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsla(192,91%,54%,0.015) 2px, hsla(192,91%,54%,0.015) 4px)',
        }}
      />

      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 80%, hsla(192,91%,54%,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-20">
        <div className="w-full max-w-md">

          {/* Screen 1 — The Mission */}
          {step === 0 && (
            <div className="text-center animate-fade-in">
              <div className="mb-10">
                <img src={logoImg} alt="The Vault" className="w-28 h-28 mx-auto mb-6 rounded-2xl" />
              </div>

              <p className="font-display text-[26px] leading-tight tracking-wide text-vault-text mb-3">
                OVER A DECADE OF COACHING.
                <br />
                ONE APP.
              </p>
              <p className="text-vault-dim text-sm mb-10">
                Change how you approach fitness.
              </p>

              <button
                onClick={next}
                className="w-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                LET'S GO →
              </button>
            </div>
          )}

          {/* Screen 2 — Belief System */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="font-display text-[20px] tracking-wide text-vault-text text-center mb-3">
                THE BELIEF SYSTEM
              </h1>
              <p className="text-vault-dim text-xs italic text-center mb-6 max-w-xs mx-auto leading-relaxed">
                "This is the ethos of CrossFit Ceylon — and the framework of my coaching for over a decade."
              </p>

              {/* 3 pillar cards */}
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {beliefs.map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setSelectedBelief(b.key)}
                    className={`flex flex-col items-center justify-center rounded-xl py-4 px-2 border transition-all ${
                      selectedBelief === b.key
                        ? 'bg-vault-pgb border-primary'
                        : 'bg-vault-bg2 border-vault-border'
                    }`}
                  >
                    <span className="text-2xl mb-1.5">{b.emoji}</span>
                    <span className="text-[11px] font-semibold text-vault-text tracking-wide">{b.label}</span>
                  </button>
                ))}
              </div>

              {/* Explanation card */}
              <div className="bg-vault-bg2 border border-primary rounded-xl p-4 mb-8">
                <p className="text-xs text-vault-mid leading-relaxed">
                  {beliefs.find((b) => b.key === selectedBelief)?.desc}
                </p>
              </div>

              <button
                onClick={next}
                className="w-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                CONTINUE →
              </button>
            </div>
          )}

          {/* Screen 3 — What's Inside */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h1 className="font-display text-[20px] tracking-wide text-vault-text text-center mb-2">
                WHAT'S INSIDE
              </h1>
              <p className="text-vault-dim text-xs text-center mb-6 leading-relaxed max-w-xs mx-auto">
                Training tracked the right way. Nutrition that travels with you. Knowledge you can trust. A coach in your pocket.
              </p>

              <div className="space-y-2.5 mb-8">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="bg-vault-bg3 border border-vault-border rounded-xl p-4 flex items-start gap-3"
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{f.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-vault-text">{f.title}</p>
                      <p className="text-[11px] text-vault-dim mt-0.5">{f.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={next}
                className="w-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                CONTINUE →
              </button>
            </div>
          )}

          {/* Screen 4 — Audit Gateway */}
          {step === 3 && (
            <div className="text-center animate-fade-in">
              <span className="text-5xl block mb-4">🎯</span>
              <h1 className="font-display text-[22px] tracking-wide text-vault-text mb-2">
                YOUR FITNESS AUDIT
              </h1>
              <p className="text-vault-dim text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                10 minutes. Find out exactly where you are, what's working, and where to start.
              </p>

              <div className="text-left space-y-2.5 mb-8 max-w-xs mx-auto">
                {checkmarks.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-vault-ok text-sm font-bold">✓</span>
                    <span className="text-xs text-vault-text">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => saveAndFinish('/audit')}
                className="w-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all mb-3"
              >
                START FITNESS AUDIT
              </button>
              <button
                onClick={() => saveAndFinish('/home')}
                className="w-full border border-vault-border2 text-vault-dim font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:border-primary hover:text-vault-text transition-all"
              >
                SKIP FOR NOW
              </button>
            </div>
          )}
        </div>
      </div>

      <ProgressDots current={step} />
    </div>
  );
};

export default OnboardingFlow;
