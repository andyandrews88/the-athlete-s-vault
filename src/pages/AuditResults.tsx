import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuditResults = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="font-mono text-[11px] tracking-[0.3em] text-primary mb-4 block">AUDIT COMPLETE</span>
        <h1 className="font-display text-4xl tracking-wide mb-6">YOUR RESULTS</h1>

        <div className="bg-vault-bg2 border border-vault-border rounded-xl p-8 mb-8">
          <p className="font-mono text-xs text-vault-dim uppercase tracking-wider mb-3">Performance Score</p>
          <p className="font-display text-7xl text-primary">{profile?.audit_score ?? '—'}</p>
          {profile?.audit_tier && (
            <span className={`inline-block mt-3 text-xs font-mono px-3 py-1 rounded ${
              profile.audit_tier === 'elite' ? 'bg-vault-gold/20 text-vault-gold' : 'bg-vault-pg text-primary'
            }`}>
              {profile.audit_tier.toUpperCase()} TIER
            </span>
          )}
        </div>

        <button
          onClick={() => navigate('/home')}
          className="bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
        >
          GO TO DASHBOARD
        </button>
      </div>
    </div>
  );
};

export default AuditResults;
