import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const tierConfig: Record<string, { color: string; barColor: string; label: string }> = {
  elite:        { color: 'text-vault-gold',  barColor: 'bg-vault-gold',  label: 'ELITE' },
  performance:  { color: 'text-primary',     barColor: 'bg-primary',     label: 'PERFORMANCE' },
  intermediate: { color: 'text-vault-warn',  barColor: 'bg-vault-warn',  label: 'INTERMEDIATE' },
  foundation:   { color: 'text-vault-bad',   barColor: 'bg-vault-bad',   label: 'FOUNDATION' },
};

const tierBadgeBg: Record<string, string> = {
  elite:        'bg-vault-gold/20 text-vault-gold',
  performance:  'bg-vault-pgb text-primary',
  intermediate: 'bg-vault-warn/20 text-vault-warn',
  foundation:   'bg-vault-bad/20 text-vault-bad',
};

const aiPriorities = [
  { icon: '🌙', text: 'Sleep is your biggest lever — aim for 7-8h consistently to unlock recovery gains.' },
  { icon: '🏋️', text: 'Prioritise hinge work — deadlift volume has room to grow relative to squat numbers.' },
  { icon: '❤️', text: 'Build your aerobic base — 2x/week zone 2 work will improve conditioning without fatiguing strength sessions.' },
];

const DomainBar = ({
  label, score, max, barColor,
}: {
  label: string; score: number; max: number; barColor: string;
}) => {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-vault-dim font-mono uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-vault-text">{Math.round(score)}/{max}</span>
      </div>
      <div className="w-full h-2 bg-vault-bg4 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const AuditResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  // Try location state first, fallback to profile
  const state = location.state as any;
  const score = state?.score ?? profile?.audit_score ?? 0;
  const tier = state?.tier ?? profile?.audit_tier ?? 'foundation';
  const mobilityScore = state?.mobilityScore ?? 0;
  const strengthScore = state?.strengthScore ?? 0;
  const conditioningScore = state?.conditioningScore ?? 0;
  const lifestyleScore = state?.lifestyleScore ?? 0;

  const cfg = tierConfig[tier] ?? tierConfig.foundation;
  const badgeCls = tierBadgeBg[tier] ?? tierBadgeBg.foundation;

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col">
      {/* Radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, hsla(192,91%,54%,0.08) 0%, transparent 60%)',
        }}
      />

      <div className="flex-1 flex items-start justify-center px-5 pt-10 pb-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="font-mono text-[11px] tracking-[0.3em] text-primary mb-4 block">
              AUDIT COMPLETE
            </span>

            {/* Score */}
            <span className={`font-display text-[72px] leading-none ${cfg.color}`}>
              {score}
            </span>
            <span className="text-vault-dim text-sm font-mono block mt-1">/100</span>

            {/* Tier badge */}
            <span className={`inline-block text-[10px] font-mono font-bold px-4 py-1.5 rounded-full mt-4 tracking-wider ${badgeCls}`}>
              {cfg.label}
            </span>
          </div>

          {/* Domain scores */}
          <div className="bg-vault-bg2 border border-vault-border rounded-xl p-5 mb-4">
            <h3 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-4">DOMAIN SCORES</h3>
            <DomainBar label="Mobility" score={mobilityScore} max={30} barColor={cfg.barColor} />
            <DomainBar label="Strength" score={strengthScore} max={25} barColor={cfg.barColor} />
            <DomainBar label="Conditioning" score={conditioningScore} max={20} barColor={cfg.barColor} />
            <DomainBar label="Lifestyle" score={lifestyleScore} max={25} barColor={cfg.barColor} />
          </div>

          {/* AI Recommendation */}
          <div className="bg-vault-bg2 border border-vault-border rounded-xl p-5 mb-4">
            <h3 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-4 flex items-center gap-2">
              <span>🤖</span> AI RECOMMENDATION
            </h3>
            <div className="space-y-3">
              {aiPriorities.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{p.icon}</span>
                  <p className="text-xs text-vault-mid leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Leaks */}
          <div className="bg-vault-bg2 border border-vault-warn/30 rounded-xl p-4 mb-8">
            <h3 className="font-mono text-[10px] tracking-[0.2em] text-vault-warn uppercase mb-2 flex items-center gap-2">
              <span>⚠</span> LEAKS
            </h3>
            <p className="text-xs text-vault-dim leading-relaxed">
              Sleep below 7h · Overhead mobility restricted · Engine below target for age
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/home')}
            className="w-full bg-primary text-primary-foreground font-bold text-[11px] tracking-wider py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
          >
            ENTER THE VAULT
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditResults;
