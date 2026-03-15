import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Play } from 'lucide-react';

const TOTAL_STEPS = 6;
const STEP_LABELS = ['Biometrics', 'Big 4', 'Engine', 'Movement', 'Lifestyle', 'Review'];

/* ── Progress Bar ── */
const ProgressBar = ({ current }: { current: number }) => (
  <div className="pt-6 pb-2 px-5">
    <span className="font-mono text-[11px] tracking-[0.3em] text-primary block mb-3">
      STEP {current + 1} OF {TOTAL_STEPS}
    </span>
    <div className="flex gap-1.5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-vault-ok' : i === current ? 'bg-primary' : 'bg-vault-border2'
          }`}
        />
      ))}
    </div>
    {/* Step labels */}
    <div className="flex gap-1.5 mt-2">
      {STEP_LABELS.map((label, i) => (
        <span
          key={label}
          className={`flex-1 text-center text-[8px] font-mono uppercase tracking-wider ${
            i <= current ? 'text-primary' : 'text-vault-dim'
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  </div>
);

/* ── Number Input ── */
const NumberInput = ({
  label, value, onChange, placeholder, sublabel,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; sublabel?: string;
}) => (
  <div className="mb-4">
    <label className="block text-xs text-vault-dim mb-1 font-mono uppercase tracking-wider">{label}</label>
    {sublabel && <span className="block text-[10px] text-vault-dim/60 mb-1.5">{sublabel}</span>}
    <input
      type="number" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-vault-bg2 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
    />
  </div>
);

/* ── Toggle Buttons (Male/Female, Yes/No/Skip) ── */
const ToggleRow = ({
  options, value, onChange,
}: {
  options: { label: string; value: string }[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="flex gap-2">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex-1 py-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
          value === opt.value
            ? opt.value === 'no' ? 'bg-vault-bad/20 text-vault-bad border border-vault-bad/40' : 'bg-primary/20 text-primary border border-primary/40'
            : 'bg-vault-bg2 text-vault-dim border border-vault-border2'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

/* ── Selectable Card ── */
const SelectCard = ({
  label, selected, onClick, sublabel,
}: {
  label: string; selected: boolean; onClick: () => void; sublabel?: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border transition-all ${
      selected ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-vault-bg2 border-vault-border2 text-vault-text'
    }`}
  >
    <span className="text-sm font-semibold block">{label}</span>
    {sublabel && <span className="text-[10px] text-vault-dim block mt-0.5">{sublabel}</span>}
  </button>
);

/* ── Lift Input with 1RM or Estimate ── */
const LiftInput = ({
  title, rm, setRm, estWt, setEstWt, estReps, setEstReps, hint,
}: {
  title: string;
  rm: string; setRm: (v: string) => void;
  estWt: string; setEstWt: (v: string) => void;
  estReps: string; setEstReps: (v: string) => void;
  hint?: string;
}) => {
  const [mode, setMode] = useState<'1rm' | 'est'>('1rm');
  const hasValue = rm || (estWt && estReps);

  return (
    <div className="bg-vault-bg2 border border-vault-border2 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-vault-text">{title}</span>
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
          hasValue ? 'bg-vault-ok/20 text-vault-ok' : 'bg-vault-bg3 text-vault-dim'
        }`}>
          {hasValue ? 'ENTERED' : 'SKIPPED'}
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('1rm')}
          className={`text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all ${
            mode === '1rm' ? 'bg-primary/20 text-primary' : 'bg-vault-bg3 text-vault-dim'
          }`}
        >
          Known 1RM
        </button>
        <button
          onClick={() => setMode('est')}
          className={`text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all ${
            mode === 'est' ? 'bg-primary/20 text-primary' : 'bg-vault-bg3 text-vault-dim'
          }`}
        >
          Estimate from reps
        </button>
      </div>

      {mode === '1rm' ? (
        <input
          type="number" inputMode="numeric" value={rm} onChange={(e) => setRm(e.target.value)}
          placeholder="e.g. 120 kg"
          className="w-full bg-vault-bg border border-vault-border2 rounded-lg px-4 py-2.5 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
        />
      ) : (
        <div className="flex gap-2">
          <input
            type="number" inputMode="numeric" value={estWt} onChange={(e) => setEstWt(e.target.value)}
            placeholder="Weight (kg)"
            className="flex-1 bg-vault-bg border border-vault-border2 rounded-lg px-3 py-2.5 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="number" inputMode="numeric" value={estReps} onChange={(e) => setEstReps(e.target.value)}
            placeholder="Reps"
            className="w-24 bg-vault-bg border border-vault-border2 rounded-lg px-3 py-2.5 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      )}
      {hint && <p className="text-[10px] text-vault-dim mt-2">{hint}</p>}
    </div>
  );
};

/* ── Review helpers ── */
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

/* ══════════════════════════════════ MAIN ══════════════════════════════════ */

const estimate1RM = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

const AuditFlow = () => {
  const navigate = useNavigate();
  const { user, refetchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Biometrics
  const [bodyWeight, setBodyWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');

  // Step 2 — Big 4
  const [bsRm, setBsRm] = useState(''); const [bsWt, setBsWt] = useState(''); const [bsReps, setBsReps] = useState('');
  const [dlRm, setDlRm] = useState(''); const [dlWt, setDlWt] = useState(''); const [dlReps, setDlReps] = useState('');
  const [spRm, setSpRm] = useState(''); const [spWt, setSpWt] = useState(''); const [spReps, setSpReps] = useState('');
  const [fsRm, setFsRm] = useState(''); const [fsWt, setFsWt] = useState(''); const [fsReps, setFsReps] = useState('');

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
  const [sleepCategory, setSleepCategory] = useState('');

  /* ── Helpers ── */
  const getBW = () => {
    const w = Number(bodyWeight);
    return weightUnit === 'lbs' ? w * 0.453592 : w;
  };

  const get1RM = (rm: string, wt: string, reps: string) => {
    if (rm) return Number(rm);
    if (wt && reps) return estimate1RM(Number(wt), Number(reps));
    return null;
  };

  /* ── Scoring ── */
  const calcStrength = () => {
    const bw = getBW();
    if (!bw) return 12.5;
    const lifts = [
      { val: get1RM(bsRm, bsWt, bsReps), target: 1.75 },
      { val: get1RM(dlRm, dlWt, dlReps), target: 2.25 },
      { val: get1RM(spRm, spWt, spReps), target: 0.75 },
      { val: get1RM(fsRm, fsWt, fsReps), target: 1.5 },
    ];
    let pts = 0, count = 0;
    lifts.forEach(({ val, target }) => {
      if (val) { pts += Math.min((val / bw) / target, 1); count++; }
    });
    return count > 0 ? (pts / count) * 25 : 12.5;
  };

  const calcEngine = () => {
    if (!cardioBenchmark || cardioBenchmark === 'none') return 10;
    const totalSec = (Number(cardioMin) || 0) * 60 + (Number(cardioSec) || 0);
    if (!totalSec) return 10;
    const targets: Record<string, number> = {
      '1mile': 420, '2krow': 420, '500mrow': 90, '2kbike': 240,
    };
    const target = targets[cardioBenchmark] || 420;
    const ratio = Math.max(0, Math.min(1, 1 - (totalSec - target) / (target * 0.8)));
    return ratio * 20;
  };

  const calcMovement = () => {
    let pts = 0;
    if (deepSquat === 'yes') pts += 5; else if (deepSquat === 'no') pts += 1;
    if (overheadReach === 'yes') pts += 5; else if (overheadReach === 'no') pts += 1;
    if (pistolSquat === 'yes') pts += 5; else if (pistolSquat === 'no') pts += 1;
    const hangSec = Number(deadHang) || 0;
    pts += Math.min(hangSec / 60, 1) * 5;
    return pts;
  };

  const calcLifestyle = () => {
    const map: Record<string, number> = { '<6h': 2.5, '6-7h': 5, '7-8h': 8, '8+h': 10 };
    return map[sleepCategory] || 5;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    const strengthScore = calcStrength();
    const engineScore = calcEngine();
    const movementScore = calcMovement();
    const lifestyleScore = calcLifestyle();
    const nutritionScore = 12.5; // placeholder — no nutrition input in audit
    const total = Math.round(strengthScore + engineScore + movementScore + lifestyleScore + nutritionScore);
    const tier = total >= 86 ? 'elite' : total >= 66 ? 'performance' : total >= 41 ? 'intermediate' : 'foundation';

    // Save audit_responses
    await supabase.from('audit_responses').insert({
      user_id: user.id,
      body_weight: bodyWeight ? Number(bodyWeight) : null,
      weight_unit: weightUnit,
      height_cm: height ? Number(height) : null,
      age: age ? Number(age) : null,
      biological_sex: sex || null,
      back_squat_1rm: get1RM(bsRm, bsWt, bsReps),
      back_squat_est_wt: bsWt ? Number(bsWt) : null,
      back_squat_est_reps: bsReps ? Number(bsReps) : null,
      deadlift_1rm: get1RM(dlRm, dlWt, dlReps),
      deadlift_est_wt: dlWt ? Number(dlWt) : null,
      deadlift_est_reps: dlReps ? Number(dlReps) : null,
      strict_press_1rm: get1RM(spRm, spWt, spReps),
      strict_press_est_wt: spWt ? Number(spWt) : null,
      strict_press_est_reps: spReps ? Number(spReps) : null,
      front_squat_1rm: get1RM(fsRm, fsWt, fsReps),
      front_squat_est_wt: fsWt ? Number(fsWt) : null,
      front_squat_est_reps: fsReps ? Number(fsReps) : null,
      cardio_benchmark: cardioBenchmark || null,
      cardio_time_min: cardioMin ? Number(cardioMin) : null,
      cardio_time_sec: cardioSec ? Number(cardioSec) : null,
      deep_squat_hold: deepSquat || null,
      overhead_reach: overheadReach || null,
      dead_hang_seconds: deadHang ? Number(deadHang) : null,
      pistol_squat: pistolSquat || null,
      sleep_category: sleepCategory || null,
    });

    // Save audit_results
    await supabase.from('audit_results').insert({
      user_id: user.id,
      score: total,
      tier,
      strength_score: Math.round(strengthScore * 10) / 10,
      conditioning_score: Math.round(engineScore * 10) / 10,
      mobility_score: Math.round(movementScore * 10) / 10,
      lifestyle_score: Math.round(lifestyleScore * 10) / 10,
      raw_data: {
        nutritionScore: Math.round(nutritionScore * 10) / 10,
        bodyWeight, weightUnit, height, age, sex,
        cardioBenchmark, cardioMin, cardioSec,
        deepSquat, overheadReach, deadHang, pistolSquat,
        sleepCategory,
      },
    });

    // Update profile
    await supabase.from('profiles').update({ audit_score: total, audit_tier: tier }).eq('id', user.id);
    refetchProfile?.();

    navigate('/results', {
      state: {
        score: total, tier,
        strengthScore: Math.round(strengthScore * 10) / 10,
        engineScore: Math.round(engineScore * 10) / 10,
        movementScore: Math.round(movementScore * 10) / 10,
        lifestyleScore: Math.round(lifestyleScore * 10) / 10,
        nutritionScore: Math.round(nutritionScore * 10) / 10,
      },
    });
  };

  const next = () => setStep((s) => s + 1);

  const CTA = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
    >
      {disabled && <Loader2 size={14} className="animate-spin" />}
      {label}
    </button>
  );

  const cardioOptions = [
    { value: '1mile', label: '1-Mile Run' },
    { value: '2krow', label: '2K Row' },
    { value: '500mrow', label: '500m Row' },
    { value: '2kbike', label: '2K Bike Erg' },
    { value: 'none', label: "I don't have one" },
  ];

  const sleepOptions = [
    { value: '<6h', label: 'Less than 6 hours' },
    { value: '6-7h', label: '6 – 7 hours' },
    { value: '7-8h', label: '7 – 8 hours' },
    { value: '8+h', label: '8+ hours' },
  ];

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col">
      <ProgressBar current={step} />

      <div className="flex-1 flex items-start justify-center px-5 pt-6 pb-12">
        <div className="w-full max-w-md animate-fade-in" key={step}>

          {/* Step 1 — Biometrics */}
          {step === 0 && (
            <div>
              <h1 className="font-display text-2xl tracking-wide mb-1">Biometrics</h1>
              <p className="text-vault-dim text-sm mb-8">Basic body data helps calibrate your scores.</p>

              <div className="mb-4">
                <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">Body Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number" inputMode="decimal" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)}
                    placeholder={weightUnit === 'kg' ? 'e.g. 80' : 'e.g. 176'}
                    className="flex-1 bg-vault-bg2 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
                  />
                  <div className="flex bg-vault-bg2 border border-vault-border2 rounded-lg overflow-hidden">
                    <button onClick={() => setWeightUnit('kg')} className={`px-3 py-3 text-xs font-mono font-bold transition-all ${weightUnit === 'kg' ? 'bg-primary/20 text-primary' : 'text-vault-dim'}`}>KG</button>
                    <button onClick={() => setWeightUnit('lbs')} className={`px-3 py-3 text-xs font-mono font-bold transition-all ${weightUnit === 'lbs' ? 'bg-primary/20 text-primary' : 'text-vault-dim'}`}>LBS</button>
                  </div>
                </div>
              </div>

              <NumberInput label="Height (cm)" value={height} onChange={setHeight} placeholder="e.g. 178" />
              <NumberInput label="Age" value={age} onChange={setAge} placeholder="e.g. 28" />

              <div className="mb-4">
                <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">Biological Sex</label>
                <ToggleRow
                  options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]}
                  value={sex} onChange={setSex}
                />
              </div>

              <CTA label="NEXT: THE BIG 4 →" onClick={next} />
            </div>
          )}

          {/* Step 2 — The Big 4 */}
          {step === 1 && (
            <div>
              <h1 className="font-display text-2xl tracking-wide mb-1">The Big 4</h1>
              <p className="text-vault-dim text-sm mb-6">Enter your 1RM or estimate from a recent set. Skip any you haven't tested.</p>

              <LiftInput title="Back Squat" rm={bsRm} setRm={setBsRm} estWt={bsWt} setEstWt={setBsWt} estReps={bsReps} setEstReps={setBsReps} hint="Sub: Leg Press or Goblet Squat" />
              <LiftInput title="Deadlift" rm={dlRm} setRm={setDlRm} estWt={dlWt} setEstWt={setDlWt} estReps={dlReps} setEstReps={setDlReps} hint="Sub: Trap Bar or RDL" />
              <LiftInput title="Strict Press" rm={spRm} setRm={setSpRm} estWt={spWt} setEstWt={setSpWt} estReps={spReps} setEstReps={setSpReps} hint="Sub: DB Shoulder Press" />
              <LiftInput title="Front Squat" rm={fsRm} setRm={setFsRm} estWt={fsWt} setEstWt={setFsWt} estReps={fsReps} setEstReps={setFsReps} hint="Sub: Zercher or Safety Bar Squat" />

              <CTA label="NEXT: ENGINE CHECK →" onClick={next} />
            </div>
          )}

          {/* Step 3 — Engine Check */}
          {step === 2 && (
            <div>
              <h1 className="font-display text-2xl tracking-wide mb-1">Engine Check</h1>
              <p className="text-vault-dim text-sm mb-6">Select a cardio benchmark you've tested recently.</p>

              <div className="space-y-2 mb-6">
                {cardioOptions.map((opt) => (
                  <SelectCard
                    key={opt.value}
                    label={opt.label}
                    selected={cardioBenchmark === opt.value}
                    onClick={() => setCardioBenchmark(opt.value)}
                  />
                ))}
              </div>

              {cardioBenchmark && cardioBenchmark !== 'none' && (
                <div className="mb-4">
                  <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">Your Time</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number" inputMode="numeric" value={cardioMin} onChange={(e) => setCardioMin(e.target.value)}
                      placeholder="min" className="flex-1 bg-vault-bg2 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors text-center"
                    />
                    <span className="text-vault-dim font-mono text-lg">:</span>
                    <input
                      type="number" inputMode="numeric" value={cardioSec} onChange={(e) => setCardioSec(e.target.value)}
                      placeholder="sec" className="flex-1 bg-vault-bg2 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors text-center"
                    />
                  </div>
                </div>
              )}

              <CTA label="NEXT: MOVEMENT SCREEN →" onClick={next} />
            </div>
          )}

          {/* Step 4 — Movement Screen */}
          {step === 3 && (
            <div>
              <h1 className="font-display text-2xl tracking-wide mb-1">Movement Screen</h1>
              <p className="text-vault-dim text-sm mb-6">Quick tests to assess your movement quality.</p>

              <div className="mb-5">
                <span className="text-sm font-semibold text-vault-text block mb-1">Deep Squat Hold</span>
                <span className="text-[10px] text-vault-dim block mb-2">Can you hold a full-depth squat for 30 seconds with heels down?</span>
                <ToggleRow
                  options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Skip', value: 'skip' }]}
                  value={deepSquat} onChange={setDeepSquat}
                />
              </div>

              <div className="mb-5">
                <span className="text-sm font-semibold text-vault-text block mb-1">Overhead Reach (Wall Test)</span>
                <span className="text-[10px] text-vault-dim block mb-2">Back flat against a wall — can you raise both arms overhead to touch?</span>
                <ToggleRow
                  options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Skip', value: 'skip' }]}
                  value={overheadReach} onChange={setOverheadReach}
                />
              </div>

              <NumberInput label="Dead Hang (seconds)" value={deadHang} onChange={setDeadHang} placeholder="e.g. 45" sublabel="How long can you hang from a bar with straight arms?" />

              <div className="mb-5">
                <span className="text-sm font-semibold text-vault-text block mb-1">Pistol Squat</span>
                <span className="text-[10px] text-vault-dim block mb-2">Can you perform a single-leg squat to full depth on either leg?</span>
                <ToggleRow
                  options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Skip', value: 'skip' }]}
                  value={pistolSquat} onChange={setPistolSquat}
                />
              </div>

              <CTA label="NEXT: LIFESTYLE →" onClick={next} />
            </div>
          )}

          {/* Step 5 — Lifestyle */}
          {step === 4 && (
            <div>
              <h1 className="font-display text-2xl tracking-wide mb-1">Lifestyle</h1>
              <p className="text-vault-dim text-sm mb-6">Sleep is the single biggest lever for recovery.</p>

              <label className="block text-xs text-vault-dim mb-3 font-mono uppercase tracking-wider">Average sleep per night</label>
              <div className="space-y-2">
                {sleepOptions.map((opt) => (
                  <SelectCard
                    key={opt.value}
                    label={opt.label}
                    selected={sleepCategory === opt.value}
                    onClick={() => setSleepCategory(opt.value)}
                  />
                ))}
              </div>

              <CTA label="NEXT: REVIEW →" onClick={next} />
            </div>
          )}

          {/* Step 6 — Review */}
          {step === 5 && (
            <div>
              <h1 className="font-display text-2xl tracking-wide mb-1">Your Profile Summary</h1>
              <p className="text-vault-dim text-sm mb-6">Review your responses before we calculate your score.</p>

              <div className="space-y-3 mb-8">
                <ReviewSection title="Biometrics">
                  <ReviewItem label="Weight" value={bodyWeight ? `${bodyWeight} ${weightUnit}` : '—'} />
                  <ReviewItem label="Height" value={height ? `${height} cm` : '—'} />
                  <ReviewItem label="Age" value={age || '—'} />
                  <ReviewItem label="Sex" value={sex || '—'} />
                </ReviewSection>
                <ReviewSection title="The Big 4">
                  <ReviewItem label="Back Squat" value={get1RM(bsRm, bsWt, bsReps) ? `${get1RM(bsRm, bsWt, bsReps)} kg` : '—'} />
                  <ReviewItem label="Deadlift" value={get1RM(dlRm, dlWt, dlReps) ? `${get1RM(dlRm, dlWt, dlReps)} kg` : '—'} />
                  <ReviewItem label="Strict Press" value={get1RM(spRm, spWt, spReps) ? `${get1RM(spRm, spWt, spReps)} kg` : '—'} />
                  <ReviewItem label="Front Squat" value={get1RM(fsRm, fsWt, fsReps) ? `${get1RM(fsRm, fsWt, fsReps)} kg` : '—'} />
                </ReviewSection>
                <ReviewSection title="Engine">
                  <ReviewItem label="Benchmark" value={cardioBenchmark === 'none' ? 'None' : cardioOptions.find(o => o.value === cardioBenchmark)?.label || '—'} />
                  {cardioBenchmark && cardioBenchmark !== 'none' && (
                    <ReviewItem label="Time" value={`${cardioMin || 0}:${(cardioSec || '0').padStart(2, '0')}`} />
                  )}
                </ReviewSection>
                <ReviewSection title="Movement">
                  <ReviewItem label="Deep Squat" value={deepSquat || '—'} />
                  <ReviewItem label="Overhead Reach" value={overheadReach || '—'} />
                  <ReviewItem label="Dead Hang" value={deadHang ? `${deadHang}s` : '—'} />
                  <ReviewItem label="Pistol Squat" value={pistolSquat || '—'} />
                </ReviewSection>
                <ReviewSection title="Lifestyle">
                  <ReviewItem label="Sleep" value={sleepCategory || '—'} />
                </ReviewSection>
              </div>

              <CTA label="CALCULATE MY SCORE" onClick={handleSubmit} disabled={saving} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditFlow;
