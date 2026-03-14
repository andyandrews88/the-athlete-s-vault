import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/* ─── Progress Dots ─── */
const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex gap-[5px] justify-center">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-[2px] rounded-full ${
          i === current ? 'w-4 bg-primary' : 'w-[6px] bg-vault-border2'
        }`}
      />
    ))}
  </div>
);

/* ─── Screen wrapper ─── */
const Screen = ({
  children,
  current,
  total,
  bg,
  scanLine,
}: {
  children: React.ReactNode;
  current: number;
  total: number;
  bg?: string;
  scanLine?: boolean;
}) => (
  <div
    className={`min-h-screen flex flex-col items-center justify-between px-4 py-6 text-center ${scanLine ? 'scan-line' : ''}`}
    style={{ background: bg || 'hsl(var(--bg))' }}
  >
    <div />
    <div className="w-full max-w-md">{children}</div>
    <ProgressDots current={current} total={total} />
  </div>
);

/* ─── Belief Pillar Card ─── */
const PillarCard = ({
  emoji,
  label,
  active,
}: {
  emoji: string;
  label: string;
  active?: boolean;
}) => (
  <div
    className={`flex-1 rounded-lg p-2 text-center ${
      active
        ? 'bg-vault-pgb border border-primary/40'
        : 'bg-vault-bg3 border border-vault-border'
    }`}
  >
    <div className="text-base mb-0.5">{emoji}</div>
    <div
      className={`font-display text-xs tracking-wider ${
        active ? 'text-primary' : 'text-vault-mid'
      }`}
    >
      {label}
    </div>
  </div>
);

/* ─── Feature Row ─── */
const FeatureRow = ({
  emoji,
  title,
  sub,
}: {
  emoji: string;
  title: string;
  sub: string;
}) => (
  <div className="flex items-center gap-2 p-[7px] bg-vault-bg3 border border-vault-border rounded-lg">
    <span className="text-sm">{emoji}</span>
    <div className="text-left">
      <div className="text-[9px] font-semibold text-vault-text">{title}</div>
      <div className="text-[7px] text-vault-dim">{sub}</div>
    </div>
  </div>
);

/* ─── Checklist Item ─── */
const CheckItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-1.5 text-[9px] text-vault-mid">
    <span className="text-vault-ok">✓</span> {text}
  </div>
);

/* ─── Primary Button ─── */
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
    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.97] transition-transform"
  >
    {loading && <Loader2 size={14} className="animate-spin" />}
    {children}
  </button>
);

/* ─── Outline Button ─── */
const BtnOutline = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full py-1.5 rounded-lg bg-transparent text-primary border border-primary/30 text-[9px] font-semibold mt-1 opacity-45 hover:opacity-70 transition-opacity"
  >
    {children}
  </button>
);

/* ═══════════════════════════ MAIN ═══════════════════════════ */
const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user, refetchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const TOTAL = 4;

  const next = () => setStep((s) => Math.min(s + 1, TOTAL - 1));

  const handleStartAudit = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user.id);
    refetchProfile?.();
    navigate('/audit');
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user.id);
    refetchProfile?.();
    navigate('/home');
  };

  return (
    <>
      {/* Screen 1 — Opening */}
      {step === 0 && (
        <Screen
          current={0}
          total={TOTAL}
          bg="radial-gradient(ellipse at 50% 30%, hsla(192,91%,54%,.06), hsl(var(--bg)) 60%)"
          scanLine
        >
          <div className="mb-3.5 px-4">
            <div className="font-display text-[26px] tracking-wider leading-tight text-vault-text">
              THE VAULT
            </div>
          </div>
          <div className="font-display text-[26px] tracking-wider leading-tight mb-2">
            10 YEARS OF COACHING.
            <br />
            ONE APP.
          </div>
          <div className="text-[10px] text-vault-dim mb-4">
            Change how you approach fitness.
          </div>
          <BtnPrimary onClick={next}>Let's go →</BtnPrimary>
        </Screen>
      )}

      {/* Screen 2 — Belief System */}
      {step === 1 && (
        <Screen current={1} total={TOTAL}>
          <div className="font-display text-xl tracking-wider mb-[7px]">
            THE BELIEF SYSTEM
          </div>
          <div className="text-[9px] text-vault-dim leading-relaxed mb-3.5 italic">
            "This is the ethos of CrossFit Ceylon — and the framework of my
            coaching for over a decade."
          </div>
          <div className="flex gap-[5px] w-full mb-3">
            <PillarCard emoji="❤️" label="HEALTH" />
            <PillarCard emoji="⚡" label="PERF." active />
            <PillarCard emoji="✨" label="AESTH." />
          </div>
          <div className="bg-vault-bg2 border border-primary/20 rounded-[10px] p-[11px] text-left mb-2.5 bg-gradient-to-br from-vault-pgb to-primary/[.02]">
            <div className="font-mono text-[8px] tracking-widest text-primary uppercase mb-[5px]">
              PERFORMANCE
            </div>
            <div className="text-[9px] text-vault-mid leading-relaxed">
              Train with purpose. Track what matters. Get stronger every week.
            </div>
          </div>
          <BtnPrimary onClick={next}>Continue →</BtnPrimary>
        </Screen>
      )}

      {/* Screen 3 — What's Inside */}
      {step === 2 && (
        <Screen current={2} total={TOTAL}>
          <div className="font-display text-xl tracking-wider mb-[7px]">
            WHAT'S INSIDE
          </div>
          <div className="text-[9px] text-vault-dim leading-relaxed mb-3.5">
            Training tracked the right way. Nutrition that travels with you.
            Knowledge you can trust. A coach in your pocket.
          </div>
          <div className="flex flex-col gap-[5px] mb-3.5">
            <FeatureRow
              emoji="🏋️"
              title="Training tracked the right way"
              sub="Patterns, volume, intensity, PRs"
            />
            <FeatureRow
              emoji="🥗"
              title="Nutrition that travels with you"
              sub="Hand portions or full macro tracking"
            />
            <FeatureRow
              emoji="📚"
              title="Knowledge you can trust"
              sub="Curated by a coach, free forever"
            />
            <FeatureRow
              emoji="🤖"
              title="A coach in your pocket"
              sub="AI that knows your data, speaks in Andy's voice"
            />
          </div>
          <BtnPrimary onClick={next}>Continue →</BtnPrimary>
        </Screen>
      )}

      {/* Screen 4 — Audit Gateway */}
      {step === 3 && (
        <Screen
          current={3}
          total={TOTAL}
          bg="radial-gradient(ellipse at 50% 70%, hsla(192,91%,54%,.05), hsl(var(--bg)) 60%)"
        >
          <div className="text-[32px] mb-2">🎯</div>
          <div className="font-display text-[22px] tracking-wider mb-[5px]">
            YOUR FITNESS AUDIT
          </div>
          <div className="text-[9px] text-vault-dim leading-relaxed mb-3.5">
            10 minutes. Find out exactly where you are, what's working, and
            where to start.
          </div>
          <div className="flex flex-col gap-1 mb-3.5 text-left">
            <CheckItem text="Strength & engine assessment" />
            <CheckItem text="Movement screen" />
            <CheckItem text="Lifestyle & recovery snapshot" />
            <CheckItem text="Personalised score & tier" />
          </div>
          <BtnPrimary onClick={handleStartAudit} loading={saving} disabled={saving}>
            Start Fitness Audit
          </BtnPrimary>
          <BtnOutline onClick={handleSkip}>Skip for now</BtnOutline>
        </Screen>
      )}
    </>
  );
};

export default OnboardingFlow;
