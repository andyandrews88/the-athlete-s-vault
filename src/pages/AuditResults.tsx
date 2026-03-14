import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const tierConfig: Record<string, { label: string; color: string }> = {
  elite: { label: '🏆 ELITE', color: 'text-vault-gold' },
  advanced: { label: '⚡ ADVANCED', color: 'text-primary' },
  intermediate: { label: '⚡ INTERMEDIATE', color: 'text-vault-warn' },
  beginner: { label: '🌱 BEGINNER', color: 'text-vault-ok' },
};

const domainColors = [
  'bg-primary',
  'bg-[#0099CC]',
  'bg-[hsl(262,60%,55%)]',
  'bg-vault-warn',
  'bg-vault-ok',
];

const DomainBar = ({
  label,
  score,
  colorClass,
}: {
  label: string;
  score: number;
  colorClass: string;
}) => (
  <div className="flex items-center gap-[5px] mb-[5px]">
    <div className="font-mono text-[7px] text-vault-dim w-[50px] flex-shrink-0 text-right">
      {label}
    </div>
    <div className="flex-1 h-1 bg-vault-bg4 rounded-[3px] overflow-hidden">
      <div
        className={`h-full rounded-[3px] ${colorClass} transition-all duration-700`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
    <div className="font-mono text-[7px] text-vault-dim w-5 text-right flex-shrink-0">
      {score}
    </div>
  </div>
);

const AuditResults = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const score = profile?.audit_score ?? 0;
  const tier = profile?.audit_tier ?? 'beginner';
  const cfg = tierConfig[tier] ?? tierConfig.beginner;

  // Mock domain scores derived from total
  const domains = [
    { label: 'Strength', score: Math.min(Math.round(score * 1.1), 100) },
    { label: 'Engine', score: Math.round(score * 0.88) },
    { label: 'Movement', score: Math.round(score * 0.95) },
    { label: 'Lifestyle', score: Math.round(score * 0.78) },
    { label: 'Nutrition', score: Math.round(score * 0.97) },
  ];

  const getRecommendation = () => {
    if (score >= 80)
      return "Outstanding baseline. Your numbers are solid across all domains. Let's focus on optimising weak points and pushing into elite territory.";
    if (score >= 65)
      return "Your strength numbers are solid — squat-to-deadlift ratio is good. Your main leak is lifestyle: sleep and stress management are limiting your recovery. Start with the Functional Bodybuilding programme to build your base while improving body composition.";
    if (score >= 45)
      return "Solid starting point. There's clear room for growth in both strength and conditioning. A structured programme will help you build consistency and see measurable progress.";
    return "Everyone starts somewhere. Your personalised programme will focus on building fundamentals — movement quality, basic strength, and healthy habits.";
  };

  const getLeaks = () => {
    const leaks: string[] = [];
    if (domains[3].score < 65) leaks.push('Sleep below 7h');
    if (domains[2].score < 75) leaks.push('Overhead mobility restricted');
    if (domains[1].score < 70) leaks.push('Engine below target for age');
    if (leaks.length === 0) leaks.push('No major leaks detected');
    return leaks.join(' · ');
  };

  return (
    <div className="min-h-screen bg-vault-bg">
      <div className="px-3 pt-6 pb-8">
        {/* Score */}
        <div className="text-center py-2 pb-2.5">
          <div
            className="font-display text-[58px] tracking-wider leading-none"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(192, 60%, 40%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {score}
          </div>
          <div className={`font-mono text-[9px] tracking-widest uppercase mt-[2px] ${cfg.color}`}>
            {cfg.label}
          </div>
        </div>

        {/* Domain Scores */}
        <div className="bg-vault-bg2 border border-vault-border rounded-[10px] p-[11px] mb-2">
          <div className="font-mono text-[8px] tracking-widest text-vault-dim uppercase mb-[7px]">
            Domain Scores
          </div>
          {domains.map((d, i) => (
            <DomainBar key={d.label} label={d.label} score={d.score} colorClass={domainColors[i]} />
          ))}
        </div>

        {/* AI Recommendation */}
        <div className="bg-vault-bg2 border border-primary/20 rounded-[10px] p-[11px] mb-[7px] bg-gradient-to-br from-vault-pgb to-primary/[.02]">
          <div className="flex items-center gap-[5px] mb-[7px]">
            <span className="text-xs">🤖</span>
            <div className="font-mono text-[8px] tracking-widest text-primary uppercase">
              AI Recommendation
            </div>
          </div>
          <div className="text-[9px] text-vault-mid leading-relaxed">
            {getRecommendation()}
          </div>
        </div>

        {/* Leaks */}
        <div className="bg-vault-bad/[.04] border border-vault-bad/20 rounded-[10px] p-[11px] mb-[7px]">
          <div className="font-mono text-[8px] tracking-widest text-vault-bad uppercase mb-1">
            ⚠ Leaks
          </div>
          <div className="text-[9px] text-vault-mid leading-relaxed">
            {getLeaks()}
          </div>
        </div>

        {/* Recommended Programme */}
        <div className="bg-vault-bg2 border border-primary/20 rounded-[10px] p-[11px] bg-gradient-to-br from-vault-pgb to-primary/[.02]">
          <div className="font-mono text-[8px] tracking-widest text-vault-dim uppercase mb-1.5">
            Recommended Programme
          </div>
          <div className="text-[11px] font-semibold mb-[2px]">Functional Bodybuilding</div>
          <div className="text-[8px] text-vault-dim font-mono mb-2">
            12 WEEKS · FREE · STARTS NOW
          </div>
          <button
            onClick={() => navigate('/home')}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] hover:scale-[1.02] active:scale-[0.97] transition-transform"
          >
            Enrol Now — Free →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditResults;
