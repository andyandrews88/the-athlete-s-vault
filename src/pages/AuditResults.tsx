import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const tierConfig: Record<string, { color: string; barColor: string; label: string; ring: string }> = {
  elite:        { color: 'text-vault-gold',  barColor: 'bg-vault-gold',  label: 'ELITE',        ring: 'stroke-vault-gold' },
  performance:  { color: 'text-primary',     barColor: 'bg-primary',     label: 'PERFORMANCE',  ring: 'stroke-primary' },
  intermediate: { color: 'text-vault-warn',  barColor: 'bg-vault-warn',  label: 'INTERMEDIATE', ring: 'stroke-vault-warn' },
  foundation:   { color: 'text-vault-bad',   barColor: 'bg-vault-bad',   label: 'FOUNDATION',   ring: 'stroke-vault-bad' },
};

const tierBadgeBg: Record<string, string> = {
  elite:        'bg-vault-gold/20 text-vault-gold',
  performance:  'bg-vault-pgb text-primary',
  intermediate: 'bg-vault-warn/20 text-vault-warn',
  foundation:   'bg-vault-bad/20 text-vault-bad',
};

/* ── Animated Score Circle ── */
const ScoreCircle = ({ score, tier }: { score: number; tier: string }) => {
  const [display, setDisplay] = useState(0);
  const cfg = tierConfig[tier] ?? tierConfig.foundation;

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokePct = circumference - (display / 100) * circumference;

  return (
    <div className="relative w-44 h-44 mx-auto mb-4">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="8" className="stroke-vault-border2" />
        <circle
          cx="80" cy="80" r={radius} fill="none" strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={strokePct}
          strokeLinecap="round"
          className={`${cfg.ring} transition-none`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-5xl leading-none ${cfg.color}`}>{display}</span>
        <span className="text-vault-dim text-xs font-mono">/100</span>
      </div>
    </div>
  );
};

/* ── Domain Bar ── */
const DomainBar = ({ label, score, max, barColor }: { label: string; score: number; max: number; barColor: string }) => {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-vault-dim font-mono uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-vault-text">{Math.round(score * 10) / 10}/{max}</span>
      </div>
      <div className="w-full h-2 bg-vault-bg4 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/* ══════════════════════════════════ MAIN ══════════════════════════════════ */

const AuditResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, refetchProfile } = useAuth();
  const [enrolling, setEnrolling] = useState(false);

  const state = location.state as any;
  const score = state?.score ?? profile?.audit_score ?? 0;
  const tier = state?.tier ?? profile?.audit_tier ?? 'foundation';
  const strengthScore = state?.strengthScore ?? 0;
  const engineScore = state?.engineScore ?? 0;
  const movementScore = state?.movementScore ?? 0;
  const lifestyleScore = state?.lifestyleScore ?? 0;
  const nutritionScore = state?.nutritionScore ?? 12.5;

  const cfg = tierConfig[tier] ?? tierConfig.foundation;
  const badgeCls = tierBadgeBg[tier] ?? tierBadgeBg.foundation;

  const handleEnrol = async () => {
    if (!user) return;
    setEnrolling(true);
    await supabase.from('profiles').update({ audit_score: score, audit_tier: tier }).eq('id', user.id);
    refetchProfile?.();
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, hsla(192,91%,54%,0.08) 0%, transparent 60%)' }}
      />

      <div className="flex-1 flex items-start justify-center px-5 pt-10 pb-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in">

          {/* Header */}
          <div className="text-center mb-6">
            <span className="font-mono text-[11px] tracking-[0.3em] text-primary mb-4 block">AUDIT COMPLETE</span>
            <ScoreCircle score={score} tier={tier} />
            <span className={`inline-block text-[10px] font-mono font-bold px-4 py-1.5 rounded-full tracking-wider ${badgeCls}`}>
              {cfg.label}
            </span>
          </div>

          {/* Domain scores — 5 domains */}
          <div className="bg-vault-bg2 border border-vault-border rounded-xl p-5 mb-4">
            <h3 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-4">DOMAIN SCORES</h3>
            <DomainBar label="Strength" score={strengthScore} max={25} barColor={cfg.barColor} />
            <DomainBar label="Engine" score={engineScore} max={20} barColor={cfg.barColor} />
            <DomainBar label="Movement" score={movementScore} max={20} barColor={cfg.barColor} />
            <DomainBar label="Lifestyle" score={lifestyleScore} max={10} barColor={cfg.barColor} />
            <DomainBar label="Nutrition" score={nutritionScore} max={25} barColor={cfg.barColor} />
          </div>

          {/* AI Recommendation */}
          <div className="bg-vault-bg2 border border-vault-border rounded-xl p-5 mb-4">
            <h3 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-4 flex items-center gap-2">
              <span>🤖</span> AI RECOMMENDATION
            </h3>
            <p className="text-xs text-vault-mid leading-relaxed">
              Based on your audit, focus on building a consistent training base. Prioritise compound lifts 3-4 days per week, 
              add 2 sessions of zone-2 cardio, and aim for 7-8 hours of sleep consistently. 
              Track your nutrition for at least 2 weeks to establish your baseline before making changes.
            </p>
          </div>

          {/* Leaks */}
          <div className="bg-vault-bg2 border border-vault-warn/30 rounded-xl p-4 mb-4">
            <h3 className="font-mono text-[10px] tracking-[0.2em] text-vault-warn uppercase mb-2 flex items-center gap-2">
              <span>⚠</span> LEAKS
            </h3>
            <p className="text-xs text-vault-dim leading-relaxed">
              {tier === 'foundation' && 'Multiple domains below threshold · Build consistency before intensity'}
              {tier === 'intermediate' && 'Sleep or movement may be limiting recovery · Engine has room to grow'}
              {tier === 'performance' && 'Minor imbalances detected · Fine-tune weak domains for elite status'}
              {tier === 'elite' && 'Minimal leaks detected · Maintain consistency across all domains'}
            </p>
          </div>

          {/* Recommended Programme */}
          <div className="bg-vault-bg2 border border-primary/30 rounded-xl p-5 mb-8">
            <h3 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-3">RECOMMENDED PROGRAMME</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-lg text-vault-text">Functional Bodybuilding</span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-vault-ok/20 text-vault-ok">FREE</span>
            </div>
            <p className="text-xs text-vault-dim mb-1">12 WEEKS · 4 DAYS/WEEK</p>
            <p className="text-xs text-vault-mid leading-relaxed mb-4">
              A structured programme blending strength and conditioning — designed for your current level.
            </p>
            <button
              onClick={handleEnrol}
              disabled={enrolling}
              className="w-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enrolling && <Loader2 size={14} className="animate-spin" />}
              ENROL NOW — FREE →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditResults;
