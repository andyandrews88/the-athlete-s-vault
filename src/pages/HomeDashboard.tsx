import { useAuth } from '@/hooks/useAuth';

const HomeDashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'Athlete';

  return (
    <div className="min-h-screen bg-vault-bg pt-12 pb-[60px]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="font-display text-4xl tracking-wide mb-2">WELCOME BACK</h1>
        <p className="text-vault-dim text-sm mb-8">{firstName}, let's get to work.</p>

        <div className="bg-vault-bg2 border border-vault-border rounded-xl p-6 mb-4">
          <p className="font-mono text-xs text-vault-dim uppercase tracking-wider mb-2">Audit Score</p>
          <p className="font-display text-5xl text-primary">
            {profile?.audit_score ?? '—'}
          </p>
          {profile?.audit_tier && (
            <span className={`inline-block mt-2 text-xs font-mono px-2 py-0.5 rounded ${
              profile.audit_tier === 'elite' ? 'bg-vault-gold/20 text-vault-gold' : 'bg-vault-pg text-primary'
            }`}>
              {profile.audit_tier.toUpperCase()}
            </span>
          )}
        </div>

        <div className="bg-vault-bg2 border border-vault-border rounded-xl p-6">
          <p className="font-mono text-xs text-vault-dim uppercase tracking-wider mb-2">Current Tier</p>
          <p className="font-display text-2xl">{(profile?.tier || 'free').toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
