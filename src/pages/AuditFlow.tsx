import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const TOTAL_STEPS = 6;

const ProgressBar = ({ current }: { current: number }) => (
  <div className="pt-6 pb-2 px-4">
    <div className="flex items-center justify-between mb-3">
      <span className="font-mono text-[11px] tracking-[0.3em] text-primary">
        STEP {current + 1} OF {TOTAL_STEPS}
      </span>
    </div>
    <div className="w-full h-1.5 bg-vault-bg4 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${((current + 1) / TOTAL_STEPS) * 100}%` }}
      />
    </div>
  </div>
);

const SliderField = ({
  label,
  sublabel,
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) => (
  <div className="mb-5">
    <div className="flex items-center justify-between mb-2">
      <div>
        <span className="text-sm font-semibold text-vault-text block">{label}</span>
        <span className="text-[11px] text-vault-dim">{sublabel}</span>
      </div>
      <span className="font-mono text-lg text-primary font-bold min-w-[2ch] text-right">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary h-2 bg-vault-bg4 rounded-full appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
        [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
        [&::-webkit-slider-runnable-track]:rounded-full"
    />
  </div>
);

const NumberInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="mb-4">
    <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">
      {label}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-vault-bg2 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
    />
  </div>
);

const AuditFlow = () => {
  const navigate = useNavigate();
  const { user, refetchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Mobility
  const [hipFlexion, setHipFlexion] = useState(5);
  const [shoulderFlexion, setShoulderFlexion] = useState(5);
  const [thoracicRotation, setThoracicRotation] = useState(5);

  // Strength
  const [backSquat, setBackSquat] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [ohp, setOhp] = useState('');
  const [pullups, setPullups] = useState('');

  // Conditioning
  const [run400, setRun400] = useState('');
  const [burpees, setBurpees] = useState('');
  const [doubleUnders, setDoubleUnders] = useState('');

  // Lifestyle
  const [sleep, setSleep] = useState(5);
  const [stress, setStress] = useState(5);
  const [nutrition, setNutrition] = useState(5);
  const [recovery, setRecovery] = useState(5);

  // Training history
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [yearsTraining, setYearsTraining] = useState('');
  const [primarySport, setPrimarySport] = useState('');
  const [injuries, setInjuries] = useState('');

  const calculateScore = () => {
    // Mobility: avg of 3 sliders (0-10) → max 25 pts
    const mobilityAvg = (hipFlexion + shoulderFlexion + thoracicRotation) / 3;
    const mobilityScore = (mobilityAvg / 10) * 25;

    // Strength: based on filled inputs → max 25 pts
    let strengthPts = 0;
    let strengthCount = 0;
    if (backSquat) { strengthPts += Math.min(Number(backSquat) / 200, 1); strengthCount++; }
    if (deadlift) { strengthPts += Math.min(Number(deadlift) / 250, 1); strengthCount++; }
    if (ohp) { strengthPts += Math.min(Number(ohp) / 100, 1); strengthCount++; }
    if (pullups) { strengthPts += Math.min(Number(pullups) / 20, 1); strengthCount++; }
    const strengthScore = strengthCount > 0 ? (strengthPts / strengthCount) * 25 : 12;

    // Conditioning → max 25 pts
    let condPts = 0;
    let condCount = 0;
    if (run400) { condPts += Math.max(0, 1 - (Number(run400) - 60) / 120); condCount++; }
    if (burpees) { condPts += Math.min(Number(burpees) / 30, 1); condCount++; }
    if (doubleUnders) { condPts += Math.min(Number(doubleUnders) / 50, 1); condCount++; }
    const condScore = condCount > 0 ? (condPts / condCount) * 25 : 12;

    // Lifestyle: avg of 4 sliders (1-10) → max 25 pts
    const lifestyleAvg = (sleep + stress + nutrition + recovery) / 4;
    const lifestyleScore = ((lifestyleAvg - 1) / 9) * 25;

    return Math.round(mobilityScore + strengthScore + condScore + lifestyleScore);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    const score = calculateScore();
    const tier =
      score >= 80 ? 'elite' : score >= 65 ? 'advanced' : score >= 45 ? 'intermediate' : 'beginner';

    // Save audit responses
    await supabase.from('audit_responses' as any).insert({
      user_id: user.id,
      hip_flexion: hipFlexion,
      shoulder_flexion: shoulderFlexion,
      thoracic_rotation: thoracicRotation,
      back_squat_1rm: backSquat ? Number(backSquat) : null,
      deadlift_1rm: deadlift ? Number(deadlift) : null,
      overhead_press_1rm: ohp ? Number(ohp) : null,
      max_pullups: pullups ? Number(pullups) : null,
      run_400m_seconds: run400 ? Number(run400) : null,
      max_burpees_60s: burpees ? Number(burpees) : null,
      max_double_unders: doubleUnders ? Number(doubleUnders) : null,
      sleep_quality: sleep,
      stress_level: stress,
      nutrition_consistency: nutrition,
      recovery_quality: recovery,
      days_per_week: daysPerWeek ? Number(daysPerWeek) : null,
      years_training: yearsTraining ? Number(yearsTraining) : null,
      primary_sport: primarySport || null,
      injuries: injuries || null,
    } as any);

    // Update profile score
    await supabase
      .from('profiles')
      .update({ audit_score: score, audit_tier: tier })
      .eq('id', user.id);

    refetchProfile?.();
    navigate('/results');
  };

  const next = () => setStep((s) => s + 1);

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col">
      <ProgressBar current={step} />

      <div className="flex-1 flex items-start justify-center px-4 pt-6 pb-12">
        <div className="w-full max-w-md">
          {/* Step 1 — Mobility */}
          {step === 0 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-2">Mobility Assessment</h1>
              <p className="text-vault-dim text-sm mb-8">
                Rate your current range of motion for each movement
              </p>
              <SliderField label="Hip Flexion ROM" sublabel="0 = severe restriction, 10 = full range" value={hipFlexion} onChange={setHipFlexion} />
              <SliderField label="Shoulder Flexion" sublabel="0 = severe restriction, 10 = full range" value={shoulderFlexion} onChange={setShoulderFlexion} />
              <SliderField label="Thoracic Rotation" sublabel="0 = severe restriction, 10 = full range" value={thoracicRotation} onChange={setThoracicRotation} />
              <button onClick={next} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all mt-4">
                NEXT
              </button>
            </div>
          )}

          {/* Step 2 — Strength */}
          {step === 1 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-2">Strength Baseline</h1>
              <p className="text-vault-dim text-sm mb-8">
                Enter your current 1 rep max or best estimate. Leave blank if unsure.
              </p>
              <NumberInput label="Back Squat 1RM (kg)" value={backSquat} onChange={setBackSquat} placeholder="e.g. 120" />
              <NumberInput label="Deadlift 1RM (kg)" value={deadlift} onChange={setDeadlift} placeholder="e.g. 160" />
              <NumberInput label="Overhead Press 1RM (kg)" value={ohp} onChange={setOhp} placeholder="e.g. 60" />
              <NumberInput label="Max Unbroken Pull-ups (reps)" value={pullups} onChange={setPullups} placeholder="e.g. 12" />
              <button onClick={next} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all mt-4">
                NEXT
              </button>
            </div>
          )}

          {/* Step 3 — Conditioning */}
          {step === 2 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-2">Conditioning Baseline</h1>
              <p className="text-vault-dim text-sm mb-8">
                Be honest — this helps us calibrate your programme.
              </p>
              <NumberInput label="400m Run Time (seconds, e.g. 90 for 1:30)" value={run400} onChange={setRun400} placeholder="e.g. 90" />
              <NumberInput label="Max Burpees in 60 seconds (reps)" value={burpees} onChange={setBurpees} placeholder="e.g. 20" />
              <NumberInput label="Max unbroken double-unders (reps, 0 if none)" value={doubleUnders} onChange={setDoubleUnders} placeholder="e.g. 30" />
              <button onClick={next} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all mt-4">
                NEXT
              </button>
            </div>
          )}

          {/* Step 4 — Lifestyle */}
          {step === 3 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-2">Lifestyle Assessment</h1>
              <p className="text-vault-dim text-sm mb-8">
                Rate your current lifestyle on average
              </p>
              <SliderField label="Sleep Quality" sublabel="1 = terrible, 10 = perfect" value={sleep} onChange={setSleep} min={1} />
              <SliderField label="Stress Level" sublabel="1 = very stressed, 10 = no stress" value={stress} onChange={setStress} min={1} />
              <SliderField label="Nutrition Consistency" sublabel="1 = poor, 10 = dialled in" value={nutrition} onChange={setNutrition} min={1} />
              <SliderField label="Recovery Quality" sublabel="1 = never recover, 10 = always fresh" value={recovery} onChange={setRecovery} min={1} />
              <button onClick={next} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all mt-4">
                NEXT
              </button>
            </div>
          )}

          {/* Step 5 — Training History */}
          {step === 4 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-2">Training Background</h1>
              <p className="text-vault-dim text-sm mb-8">Tell us about your training history</p>
              <NumberInput label="Days training per week" value={daysPerWeek} onChange={setDaysPerWeek} placeholder="e.g. 5" />
              <NumberInput label="Years training seriously" value={yearsTraining} onChange={setYearsTraining} placeholder="e.g. 3" />
              <div className="mb-4">
                <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">
                  Primary sport or focus
                </label>
                <input
                  type="text"
                  value={primarySport}
                  onChange={(e) => setPrimarySport(e.target.value)}
                  placeholder='e.g. "CrossFit", "Powerlifting"'
                  className="w-full bg-vault-bg2 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">
                  Current injuries or limitations (optional)
                </label>
                <textarea
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                  rows={3}
                  placeholder="e.g. tight lower back, recovering shoulder"
                  className="w-full bg-vault-bg2 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
              <button onClick={next} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all mt-4">
                NEXT
              </button>
            </div>
          )}

          {/* Step 6 — Review & Submit */}
          {step === 5 && (
            <div>
              <h1 className="font-display text-3xl tracking-wide mb-2">Your Profile Summary</h1>
              <p className="text-vault-dim text-sm mb-8">
                Review your responses before we calculate your score.
              </p>

              <div className="space-y-4 mb-8">
                <ReviewSection title="Mobility">
                  <ReviewItem label="Hip Flexion" value={`${hipFlexion}/10`} />
                  <ReviewItem label="Shoulder Flexion" value={`${shoulderFlexion}/10`} />
                  <ReviewItem label="Thoracic Rotation" value={`${thoracicRotation}/10`} />
                </ReviewSection>

                <ReviewSection title="Strength">
                  <ReviewItem label="Back Squat" value={backSquat ? `${backSquat} kg` : '—'} />
                  <ReviewItem label="Deadlift" value={deadlift ? `${deadlift} kg` : '—'} />
                  <ReviewItem label="OHP" value={ohp ? `${ohp} kg` : '—'} />
                  <ReviewItem label="Pull-ups" value={pullups ? `${pullups} reps` : '—'} />
                </ReviewSection>

                <ReviewSection title="Conditioning">
                  <ReviewItem label="400m Run" value={run400 ? `${run400}s` : '—'} />
                  <ReviewItem label="Burpees/60s" value={burpees || '—'} />
                  <ReviewItem label="Double-unders" value={doubleUnders || '—'} />
                </ReviewSection>

                <ReviewSection title="Lifestyle">
                  <ReviewItem label="Sleep" value={`${sleep}/10`} />
                  <ReviewItem label="Stress" value={`${stress}/10`} />
                  <ReviewItem label="Nutrition" value={`${nutrition}/10`} />
                  <ReviewItem label="Recovery" value={`${recovery}/10`} />
                </ReviewSection>

                <ReviewSection title="Training">
                  <ReviewItem label="Days/week" value={daysPerWeek || '—'} />
                  <ReviewItem label="Years" value={yearsTraining || '—'} />
                  <ReviewItem label="Sport" value={primarySport || '—'} />
                  {injuries && <ReviewItem label="Injuries" value={injuries} />}
                </ReviewSection>
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                SUBMIT AUDIT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-vault-bg2 border border-vault-border rounded-xl p-4">
    <h3 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-3">{title}</h3>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const ReviewItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-vault-dim">{label}</span>
    <span className="text-xs font-mono text-vault-text">{value}</span>
  </div>
);

export default AuditFlow;
