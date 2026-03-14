import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const tierConfig: Record<string, { color: string; label: string }> = {
  elite: { color: 'bg-vault-gold/20 text-vault-gold', label: 'ELITE' },
  advanced: { color: 'bg-vault-pg text-primary', label: 'ADVANCED' },
  intermediate: { color: 'bg-vault-warn/20 text-vault-warn', label: 'INTERMEDIATE' },
  beginner: { color: 'bg-vault-bad/20 text-vault-bad', label: 'BEGINNER' },
};

const AuditResults = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const score = profile?.audit_score ?? 0;
  const tier = profile?.audit_tier ?? 'beginner';
  const cfg = tierConfig[tier] ?? tierConfig.beginner;

  const ringPercent = Math.min(score, 100);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (circumference * ringPercent) / 100;

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <span className="font-mono text-[11px] tracking-[0.3em] text-primary mb-6 block">
          AUDIT COMPLETE
        </span>
        <h1 className="font-display text-4xl tracking-wide mb-8">YOUR RESULTS</h1>

        {/* Score ring */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-vault-bg4" />
            <circle
              cx="60" cy="60" r="54" fill="none" strokeWidth="6"
              strokeLinecap="round"
              className="stroke-primary"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-5xl text-primary">{score}</span>
            <span className="text-[10px] font-mono text-vault-dim tracking-wider">/ 100</span>
          </div>
        </div>

        <span className={`inline-block text-xs font-mono px-4 py-1.5 rounded-full mb-8 ${cfg.color}`}>
          {cfg.label} TIER
        </span>

        <p className="text-vault-dim text-sm leading-relaxed mb-10 max-w-xs mx-auto">
          {score >= 80
            ? "Outstanding baseline. You're operating at an elite level — let's push further."
            : score >= 65
            ? "Strong foundation. Targeted programming will unlock your next level."
            : score >= 45
            ? "Solid starting point. There's clear room for growth — let's build."
            : "Everyone starts somewhere. Your personalised programme begins now."}
        </p>

        <button
          onClick={() => navigate('/home')}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
        >
          GO TO DASHBOARD
        </button>
      </div>
    </div>
  );
};

export default AuditResults;
