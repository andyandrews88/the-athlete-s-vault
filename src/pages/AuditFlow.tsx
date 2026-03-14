import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const AuditFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleComplete = async () => {
    if (user) {
      const score = Math.floor(40 + Math.random() * 60);
      const tier = score >= 80 ? 'elite' : score >= 60 ? 'advanced' : score >= 40 ? 'intermediate' : 'beginner';
      await supabase.from('profiles').update({ audit_score: score, audit_tier: tier }).eq('id', user.id);
      navigate('/results');
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="font-mono text-[11px] tracking-[0.3em] text-primary mb-4 block">MOVEMENT AUDIT</span>
        <h1 className="font-display text-4xl tracking-wide mb-4">YOUR BASELINE</h1>
        <p className="text-vault-dim text-sm mb-8 leading-relaxed">
          Complete the movement screening to establish your performance baseline.
        </p>
        <button
          onClick={handleComplete}
          className="bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
        >
          COMPLETE AUDIT
        </button>
      </div>
    </div>
  );
};

export default AuditFlow;
