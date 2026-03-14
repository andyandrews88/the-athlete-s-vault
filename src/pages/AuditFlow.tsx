import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const STEPS = ['Biometrics', 'Big 4', 'Engine', 'Movement', 'Lifestyle', 'Review'] as const;

/* ─── Shared Components ─── */
const StepHeader = ({ step, title, sub }: { step: number; title: string; sub: string }) => (
  <div className="px-3 pt-3 pb-0">
    <div className="font-display text-lg tracking-wider mb-[3px]">{title}</div>
    <div className="text-[8px] text-vault-dim mb-[9px]">Step {step + 1} of 6 — {sub}</div>
    {/* Segmented progress */}
    <div className="flex gap-[2px] mb-3">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-[3px] rounded-sm ${
            i < step ? 'bg-vault-ok' : i === step ? 'bg-primary' : 'bg-vault-border2'
          }`}
        />
      ))}
    </div>
    {/* Nav pills */}
    <div className="flex gap-[3px] mb-3 overflow-x-auto scrollbar-hide">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`px-[7px] py-[3px] rounded-[5px] text-[7px] font-bold whitespace-nowrap ${
            i === step
              ? 'bg-primary text-primary-foreground'
              : 'bg-vault-bg3 border border-vault-border text-vault-dim'
          }`}
        >
          {s}
        </div>
      ))}
    </div>
  </div>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-vault-bg2 border border-vault-border rounded-[10px] p-[11px] mb-2 ${className}`}>
    {children}
  </div>
);

const CardLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`font-mono text-[8px] tracking-widest text-vault-dim uppercase mb-2 ${className}`}>
    {children}
  </div>
);

const AuditInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'number',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div>
    <div className="text-[8px] text-vault-dim mb-[3px]">{label}</div>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-vault-bg3 border border-vault-border rounded-md px-[9px] py-1.5 text-[10px] text-vault-text font-mono placeholder:text-vault-dim focus:outline-none focus:border-primary/30 transition-colors"
    />
  </div>
);

const SegmentSelect = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-1">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`flex-1 py-[5px] rounded-md text-[7px] font-bold text-center transition-all ${
          value === opt
            ? 'bg-primary text-primary-foreground'
            : 'bg-vault-bg3 border border-vault-border text-vault-dim'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const YesNoSkip = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-1">
    {(['yes', 'no', 'skip'] as const).map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`flex-1 py-[5px] rounded-md text-[8px] font-bold text-center transition-all ${
          value === opt && opt === 'yes'
            ? 'bg-primary text-primary-foreground'
            : value === opt && opt === 'no'
            ? 'bg-vault-bad text-white'
            : value === opt && opt === 'skip'
            ? 'bg-vault-bg4 text-vault-text'
            : 'bg-vault-bg3 border border-vault-border text-vault-dim'
        }`}
      >
        {opt === 'yes' ? 'Yes ✓' : opt === 'no' ? 'No ✗' : 'Skip'}
      </button>
    ))}
  </div>
);

const RadioSelect = ({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; sub?: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex items-center gap-[7px] p-2 rounded-lg text-left transition-all ${
          value === opt.value
            ? 'bg-vault-pgb border border-primary/25'
            : 'bg-vault-bg3 border border-vault-border'
        }`}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
            value === opt.value
              ? 'bg-primary'
              : 'bg-vault-bg4 border border-vault-border2'
          }`}
        />
        <div>
          <div className={`text-[9px] font-semibold ${value === opt.value ? 'text-vault-text' : 'text-vault-mid'}`}>
            {opt.label}
          </div>
          {opt.sub && <div className="text-[7px] text-vault-dim">{opt.sub}</div>}
        </div>
      </button>
    ))}
  </div>
);

const BtnPrimary = ({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] mt-2 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.97] transition-transform"
  >
    {loading && <Loader2 size={14} className="animate-spin" />}
    {children}
  </button>
);

const StressBar = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-[2px]">
    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
      <button
        key={n}
        onClick={() => onChange(n)}
        className={`flex-1 h-[18px] rounded-[3px] text-[6px] flex items-center justify-center font-bold transition-all ${
          n <= value
            ? 'bg-primary text-primary-foreground'
            : 'bg-vault-bg4 text-vault-dim'
        }`}
      >
        {n}
      </button>
    ))}
  </div>
);

/* ═══════════════════════════ MAIN ═══════════════════════════ */
const AuditFlow = () => {
  const navigate = useNavigate();
  const { user, refetchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Biometrics
  const [bodyWeight, setBodyWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');

  // Step 2 — Big 4
  const [backSquat, setBackSquat] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [strictPress, setStrictPress] = useState('');
  const [frontSquat, setFrontSquat] = useState('');

  // Step 3 — Engine
  const [cardioBenchmark, setCardioBenchmark] = useState('');
  const [cardioMin, setCardioMin] = useState('');
  const [cardioSec, setCardioSec] = useState('');

  // Step 4 — Movement
  const [deepSquat, setDeepSquat] = useState('');
  const [overheadReach, setOverheadReach] = useState('');
  const [deadHang, setDeadHang] = useState('');
  const [pistolSquat, setPistolSquat] = useState('');

  // Step 5 — Lifestyle
  const [sleepCat, setSleepCat] = useState('');
  const [stressLevel, setStressLevel] = useState(5);
  const [trainingExp, setTrainingExp] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');

  const next = () => setStep((s) => s + 1);

  const calculateScore = () => {
    let total = 0;
    let count = 0;

    // Strength (max ~30)
    const lifts = [backSquat, deadlift, strictPress, frontSquat].filter(Boolean);
    if (lifts.length > 0) {
      const avg = lifts.reduce((s, v) => s + Math.min(Number(v) / 150, 1), 0) / lifts.length;
      total += avg * 30;
      count++;
    }

    // Engine (max ~20)
    if (cardioMin || cardioSec) {
      const totalSec = (Number(cardioMin) || 0) * 60 + (Number(cardioSec) || 0);
      if (totalSec > 0) {
        const engineScore = Math.max(0, 1 - (totalSec - 300) / 600);
        total += engineScore * 20;
        count++;
      }
    }

    // Movement (max ~20)
    const mvmts = [deepSquat, overheadReach, pistolSquat];
    let mvPts = 0;
    let mvCount = 0;
    mvmts.forEach((v) => {
      if (v === 'yes') { mvPts += 1; mvCount++; }
      else if (v === 'no') { mvPts += 0; mvCount++; }
    });
    if (deadHang) {
      mvPts += Math.min(Number(deadHang) / 60, 1);
      mvCount++;
    }
    if (mvCount > 0) {
      total += (mvPts / mvCount) * 20;
      count++;
    }

    // Lifestyle (max ~30)
    let lifePts = 0;
    let lifeCount = 0;
    if (sleepCat) {
      const sleepMap: Record<string, number> = { '<6h': 0.25, '6-7h': 0.5, '7-8h': 0.8, '8+h': 1 };
      lifePts += sleepMap[sleepCat] || 0.5;
      lifeCount++;
    }
    if (stressLevel) {
      lifePts += stressLevel / 10;
      lifeCount++;
    }
    if (lifeCount > 0) {
      total += (lifePts / lifeCount) * 30;
      count++;
    }

    if (count === 0) return 50; // default
    return Math.round(total);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    const score = calculateScore();
    const tier =
      score >= 80 ? 'elite' : score >= 65 ? 'advanced' : score >= 45 ? 'intermediate' : 'beginner';

    await supabase.from('audit_responses' as any).insert({
      user_id: user.id,
      body_weight: bodyWeight ? Number(bodyWeight) : null,
      weight_unit: weightUnit,
      height_cm: height ? Number(height) : null,
      age: age ? Number(age) : null,
      biological_sex: sex || null,
      back_squat_1rm: backSquat ? Number(backSquat) : null,
      deadlift_1rm: deadlift ? Number(deadlift) : null,
      strict_press_1rm: strictPress ? Number(strictPress) : null,
      front_squat_1rm: frontSquat ? Number(frontSquat) : null,
      cardio_benchmark: cardioBenchmark || null,
      cardio_time_min: cardioMin ? Number(cardioMin) : null,
      cardio_time_sec: cardioSec ? Number(cardioSec) : null,
      deep_squat_hold: deepSquat || null,
      overhead_reach: overheadReach || null,
      dead_hang_seconds: deadHang ? Number(deadHang) : null,
      pistol_squat: pistolSquat || null,
      sleep_category: sleepCat || null,
      stress_level: stressLevel,
      training_experience: trainingExp || null,
      primary_goal: primaryGoal || null,
    } as any);

    await supabase
      .from('profiles')
      .update({ audit_score: score, audit_tier: tier })
      .eq('id', user.id);

    refetchProfile?.();
    navigate('/results');
  };

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col">
      {/* Step 1 — Biometrics */}
      {step === 0 && (
        <div>
          <StepHeader step={0} title="FITNESS AUDIT" sub="Biometrics" />
          <div className="px-3 pb-6">
            <Card>
              <CardLabel>Basic Measurements</CardLabel>
              <div className="flex flex-col gap-1.5">
                <div>
                  <div className="text-[8px] text-vault-dim mb-[3px]">Body Weight</div>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={bodyWeight}
                      onChange={(e) => setBodyWeight(e.target.value)}
                      placeholder="82"
                      className="flex-1 bg-vault-bg3 border border-primary/30 rounded-md px-[9px] py-1.5 text-[10px] text-primary font-mono placeholder:text-vault-dim focus:outline-none"
                    />
                    <div className="flex bg-vault-bg3 border border-vault-border rounded-md overflow-hidden">
                      <button
                        onClick={() => setWeightUnit('kg')}
                        className={`px-2 py-1.5 text-[8px] font-bold ${
                          weightUnit === 'kg'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-vault-dim'
                        }`}
                      >
                        kg
                      </button>
                      <button
                        onClick={() => setWeightUnit('lbs')}
                        className={`px-2 py-1.5 text-[8px] font-bold ${
                          weightUnit === 'lbs'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-vault-dim'
                        }`}
                      >
                        lbs
                      </button>
                    </div>
                  </div>
                </div>
                <AuditInput label="Height (cm)" value={height} onChange={setHeight} placeholder="178" />
                <AuditInput label="Age" value={age} onChange={setAge} placeholder="32" />
                <div>
                  <div className="text-[8px] text-vault-dim mb-[3px]">Biological Sex</div>
                  <div className="flex gap-1">
                    {['Male', 'Female'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSex(s.toLowerCase())}
                        className={`flex-1 py-1.5 rounded-md text-[8px] font-bold text-center transition-all ${
                          sex === s.toLowerCase()
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-vault-bg3 border border-vault-border text-vault-dim'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <BtnPrimary onClick={next}>Next: The Big 4 →</BtnPrimary>
          </div>
        </div>
      )}

      {/* Step 2 — Big 4 */}
      {step === 1 && (
        <div>
          <StepHeader step={1} title="THE BIG 4" sub="Strength benchmarks (all optional)" />
          <div className="px-3 pb-6 flex flex-col gap-[7px]">
            {[
              { label: 'Back Squat', val: backSquat, set: setBackSquat, sub: 'Safety Bar Squat, Box Squat' },
              { label: 'Deadlift', val: deadlift, set: setDeadlift },
              { label: 'Strict Press', val: strictPress, set: setStrictPress },
              { label: 'Front Squat', val: frontSquat, set: setFrontSquat },
            ].map(({ label, val, set, sub }) => (
              <Card key={label}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] font-semibold">{label}</div>
                  {val ? (
                    <span className="font-mono text-[8px] font-bold tracking-wider bg-vault-ok/10 text-vault-ok border border-vault-ok/20 rounded px-[5px] py-[2px]">
                      ENTERED
                    </span>
                  ) : (
                    <span className="font-mono text-[8px] font-bold tracking-wider bg-vault-warn/10 text-vault-warn border border-vault-warn/20 rounded px-[5px] py-[2px]">
                      OPTIONAL
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <div className="text-[7px] text-vault-dim mb-[2px]">1RM (kg)</div>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder="—"
                      className={`w-full bg-vault-bg3 border ${val ? 'border-primary/30 text-primary' : 'border-vault-border text-vault-dim'} rounded-md px-[7px] py-[5px] text-[10px] font-mono placeholder:text-vault-dim focus:outline-none focus:border-primary/30`}
                    />
                  </div>
                </div>
                {sub && <div className="text-[7px] text-vault-dim mt-1">Substitutions: {sub}</div>}
              </Card>
            ))}
            <BtnPrimary onClick={next}>Next: Engine Check →</BtnPrimary>
          </div>
        </div>
      )}

      {/* Step 3 — Engine */}
      {step === 2 && (
        <div>
          <StepHeader step={2} title="ENGINE CHECK" sub="Aerobic capacity (optional)" />
          <div className="px-3 pb-6">
            <div className="text-[8px] text-vault-dim mb-2">Select your cardio benchmark:</div>
            <RadioSelect
              options={[
                { value: 'mile_run', label: '1-Mile Run', sub: 'Best time in min:sec' },
                { value: '2k_row', label: '2K Row' },
                { value: '500m_row', label: '500m Row' },
                { value: '2k_bike', label: '2K Bike Erg' },
                { value: 'none', label: "I don't have a cardio benchmark" },
              ]}
              value={cardioBenchmark}
              onChange={setCardioBenchmark}
            />
            {cardioBenchmark && cardioBenchmark !== 'none' && (
              <Card className="mt-2.5 bg-gradient-to-br from-vault-pgb to-primary/[.02] border-primary/20">
                <div className="text-[8px] text-vault-dim mb-1">
                  {cardioBenchmark === 'mile_run' ? '1-Mile Run' : cardioBenchmark === '2k_row' ? '2K Row' : cardioBenchmark === '500m_row' ? '500m Row' : '2K Bike Erg'} time
                </div>
                <div className="flex gap-1 items-center">
                  <div className="flex-1 bg-vault-bg3 border border-primary/30 rounded-md p-1.5">
                    <div className="text-[7px] text-vault-dim">min</div>
                    <input
                      type="number"
                      value={cardioMin}
                      onChange={(e) => setCardioMin(e.target.value)}
                      placeholder="7"
                      className="w-full bg-transparent text-primary font-mono text-[13px] focus:outline-none placeholder:text-vault-dim"
                    />
                  </div>
                  <span className="text-vault-dim text-xs">:</span>
                  <div className="flex-1 bg-vault-bg3 border border-primary/30 rounded-md p-1.5">
                    <div className="text-[7px] text-vault-dim">sec</div>
                    <input
                      type="number"
                      value={cardioSec}
                      onChange={(e) => setCardioSec(e.target.value)}
                      placeholder="24"
                      className="w-full bg-transparent text-primary font-mono text-[13px] focus:outline-none placeholder:text-vault-dim"
                    />
                  </div>
                </div>
              </Card>
            )}
            <BtnPrimary onClick={next}>Next: Movement Screen →</BtnPrimary>
          </div>
        </div>
      )}

      {/* Step 4 — Movement */}
      {step === 3 && (
        <div>
          <StepHeader step={3} title="MOVEMENT SCREEN" sub="Quality of movement" />
          <div className="px-3 pb-6 flex flex-col gap-1.5">
            <Card>
              <div className="text-[9px] font-semibold mb-[2px]">Deep Squat Hold</div>
              <div className="text-[8px] text-vault-dim mb-[7px]">
                Squat as deep as possible, heels flat, torso upright. Hold 30s. Can you do it?
              </div>
              <YesNoSkip value={deepSquat} onChange={setDeepSquat} />
            </Card>
            <Card>
              <div className="text-[9px] font-semibold mb-[2px]">Overhead Reach (Wall)</div>
              <div className="text-[8px] text-vault-dim mb-[7px]">
                Sit with back against wall. Raise arms overhead — can thumbs touch wall?
              </div>
              <YesNoSkip value={overheadReach} onChange={setOverheadReach} />
            </Card>
            <Card>
              <div className="text-[9px] font-semibold mb-[2px]">Dead Hang (seconds)</div>
              <div className="text-[8px] text-vault-dim mb-[5px]">
                Hang from bar until you drop. Enter seconds.
              </div>
              <input
                type="number"
                value={deadHang}
                onChange={(e) => setDeadHang(e.target.value)}
                placeholder="45"
                className="w-full bg-vault-bg3 border border-vault-border rounded-md px-[7px] py-[5px] text-[10px] text-vault-text font-mono placeholder:text-vault-dim focus:outline-none focus:border-primary/30"
              />
            </Card>
            <Card className={pistolSquat === 'skip' ? 'opacity-60' : ''}>
              <div className="flex justify-between items-center mb-[2px]">
                <div className="text-[9px] font-semibold">Pistol Squat</div>
                {pistolSquat === 'skip' && (
                  <span className="font-mono text-[8px] font-bold tracking-wider bg-vault-warn/10 text-vault-warn border border-vault-warn/20 rounded px-[5px] py-[2px]">
                    SKIPPED
                  </span>
                )}
              </div>
              <div className="text-[8px] text-vault-dim mb-[7px]">
                Can you perform a full pistol squat on each side?
              </div>
              <YesNoSkip value={pistolSquat} onChange={setPistolSquat} />
            </Card>
            <BtnPrimary onClick={next}>Next: Lifestyle →</BtnPrimary>
          </div>
        </div>
      )}

      {/* Step 5 — Lifestyle */}
      {step === 4 && (
        <div>
          <StepHeader step={4} title="LIFESTYLE" sub="Recovery & habits" />
          <div className="px-3 pb-6 flex flex-col gap-1.5">
            <Card>
              <CardLabel>Average Sleep</CardLabel>
              <SegmentSelect
                options={['<6h', '6-7h', '7-8h', '8+h']}
                value={sleepCat}
                onChange={setSleepCat}
              />
            </Card>
            <Card>
              <CardLabel>Stress Level (1-10)</CardLabel>
              <StressBar value={stressLevel} onChange={setStressLevel} />
            </Card>
            <Card>
              <CardLabel>Training Experience</CardLabel>
              <SegmentSelect
                options={['<1yr', '1-3yr', '3-5yr', '5+yr']}
                value={trainingExp}
                onChange={setTrainingExp}
              />
            </Card>
            <Card>
              <CardLabel>Primary Goal</CardLabel>
              <RadioSelect
                options={[
                  { value: 'body_comp', label: 'Body composition' },
                  { value: 'performance', label: 'Performance' },
                  { value: 'general_health', label: 'General health' },
                ]}
                value={primaryGoal}
                onChange={setPrimaryGoal}
              />
            </Card>
            <BtnPrimary onClick={next}>Next: Review →</BtnPrimary>
          </div>
        </div>
      )}

      {/* Step 6 — Review */}
      {step === 5 && (
        <div>
          <StepHeader step={5} title="REVIEW" sub="Confirm & submit" />
          <div className="px-3 pb-6">
            <Card>
              <CardLabel>Biometrics</CardLabel>
              <ReviewRow label="Weight" value={bodyWeight ? `${bodyWeight} ${weightUnit}` : '—'} />
              <ReviewRow label="Height" value={height ? `${height} cm` : '—'} />
              <ReviewRow label="Age" value={age || '—'} />
              <ReviewRow label="Sex" value={sex || '—'} />
            </Card>
            <Card>
              <CardLabel>Strength</CardLabel>
              <ReviewRow label="Back Squat" value={backSquat ? `${backSquat} kg` : '—'} />
              <ReviewRow label="Deadlift" value={deadlift ? `${deadlift} kg` : '—'} />
              <ReviewRow label="Strict Press" value={strictPress ? `${strictPress} kg` : '—'} />
              <ReviewRow label="Front Squat" value={frontSquat ? `${frontSquat} kg` : '—'} />
            </Card>
            <Card>
              <CardLabel>Engine</CardLabel>
              <ReviewRow label="Benchmark" value={cardioBenchmark || '—'} />
              {cardioBenchmark && cardioBenchmark !== 'none' && (
                <ReviewRow label="Time" value={`${cardioMin || 0}:${(cardioSec || '00').toString().padStart(2, '0')}`} />
              )}
            </Card>
            <Card>
              <CardLabel>Movement</CardLabel>
              <ReviewRow label="Deep Squat" value={deepSquat || '—'} />
              <ReviewRow label="Overhead Reach" value={overheadReach || '—'} />
              <ReviewRow label="Dead Hang" value={deadHang ? `${deadHang}s` : '—'} />
              <ReviewRow label="Pistol Squat" value={pistolSquat || '—'} />
            </Card>
            <Card>
              <CardLabel>Lifestyle</CardLabel>
              <ReviewRow label="Sleep" value={sleepCat || '—'} />
              <ReviewRow label="Stress" value={`${stressLevel}/10`} />
              <ReviewRow label="Experience" value={trainingExp || '—'} />
              <ReviewRow label="Goal" value={primaryGoal || '—'} />
            </Card>
            <BtnPrimary onClick={handleSubmit} disabled={saving} loading={saving}>
              Submit Audit
            </BtnPrimary>
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-[2px]">
    <span className="text-[8px] text-vault-dim">{label}</span>
    <span className="text-[8px] font-mono text-vault-text capitalize">{value}</span>
  </div>
);

export default AuditFlow;
