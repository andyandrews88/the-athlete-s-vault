import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const GOALS = [
  { emoji: '🏋️', label: 'Build Muscle' },
  { emoji: '🔥', label: 'Lose Fat' },
  { emoji: '⚡', label: 'Improve Performance' },
  { emoji: '🔄', label: 'Hybrid Training' },
  { emoji: '💪', label: 'General Fitness' },
];

const EXPERIENCE = [
  { emoji: '🌱', label: 'Beginner', sub: 'Less than 1 year' },
  { emoji: '📈', label: 'Intermediate', sub: '1 to 3 years' },
  { emoji: '🔥', label: 'Advanced', sub: '3 or more years' },
  { emoji: '🏆', label: 'Elite / Competitive', sub: 'I compete' },
];

const EQUIPMENT = [
  { emoji: '🏢', label: 'Full Commercial Gym' },
  { emoji: '🏠', label: 'Home Gym Setup' },
  { emoji: '🏋️', label: 'Barbells & Racks' },
  { emoji: '💪', label: 'Dumbbells Only' },
  { emoji: '🤸', label: 'Bodyweight Only' },
  { emoji: '⚔️', label: 'CrossFit Box' },
];

const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2 pt-6 pb-8">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`w-2.5 h-2.5 rounded-full transition-all ${
          i === current ? 'bg-primary scale-110' : 'bg-vault-bg4'
        }`}
      />
    ))}
  </div>
);

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'Athlete';

  const toggleEquipment = (label: string) => {
    setEquipment((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        goal,
        experience_level: experience,
        equipment,
        onboarding_complete: true,
      } as any)
      .eq('id', user.id);
    navigate('/audit');
  };

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col">
      <ProgressDots current={step} total={4} />

      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Screen 1 — Welcome */}
          {step === 0 && (
            <div className="text-center pt-8">
              <span className="font-display text-lg tracking-[0.2em] text-primary block mb-4">
                WELCOME TO THE VAULT
              </span>
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide mb-4">
                Let's build your performance profile, {firstName}
              </h1>
              <p className="text-vault-dim text-sm leading-relaxed mb-10">
                4 quick questions. Then we'll know exactly where to start.
              </p>
              <button
                onClick={() => setStep(1)}
                className="bg-primary text-primary-foreground font-bold px-10 py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
              >
                LET'S GO
              </button>
            </div>
          )}

          {/* Screen 2 — Goal */}
          {step === 1 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-6 text-center">
                What's your primary goal?
              </h1>
              <div className="space-y-3 mb-8">
                {GOALS.map((g) => (
                  <button
                    key={g.label}
                    onClick={() => setGoal(g.label)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                      goal === g.label
                        ? 'border-primary bg-vault-pgb'
                        : 'border-vault-border bg-vault-bg2 hover:border-vault-border2'
                    }`}
                  >
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-sm font-semibold text-vault-text">{g.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!goal}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-40 disabled:scale-100"
              >
                NEXT
              </button>
            </div>
          )}

          {/* Screen 3 — Experience */}
          {step === 2 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-6 text-center">
                How long have you been training seriously?
              </h1>
              <div className="space-y-3 mb-8">
                {EXPERIENCE.map((e) => (
                  <button
                    key={e.label}
                    onClick={() => setExperience(e.label)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
                      experience === e.label
                        ? 'border-primary bg-vault-pgb'
                        : 'border-vault-border bg-vault-bg2 hover:border-vault-border2'
                    }`}
                  >
                    <span className="text-xl">{e.emoji}</span>
                    <div>
                      <span className="text-sm font-semibold text-vault-text block">{e.label}</span>
                      <span className="text-xs text-vault-dim">{e.sub}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(3)}
                disabled={!experience}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-40 disabled:scale-100"
              >
                NEXT
              </button>
            </div>
          )}

          {/* Screen 4 — Equipment */}
          {step === 3 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-6 text-center">
                What equipment do you have access to?
              </h1>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {EQUIPMENT.map((eq) => (
                  <button
                    key={eq.label}
                    onClick={() => toggleEquipment(eq.label)}
                    className={`flex flex-col items-center gap-2 px-4 py-5 rounded-xl border transition-all ${
                      equipment.includes(eq.label)
                        ? 'border-primary bg-vault-pgb'
                        : 'border-vault-border bg-vault-bg2 hover:border-vault-border2'
                    }`}
                  >
                    <span className="text-2xl">{eq.emoji}</span>
                    <span className="text-xs font-semibold text-vault-text text-center leading-tight">
                      {eq.label}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleFinish}
                disabled={equipment.length === 0 || saving}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                START MY AUDIT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
