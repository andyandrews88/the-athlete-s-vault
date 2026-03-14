import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleComplete = async () => {
    if (user) {
      await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id);
      navigate('/audit');
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="font-mono text-[11px] tracking-[0.3em] text-primary mb-4 block">ONBOARDING</span>
        <h1 className="font-display text-4xl tracking-wide mb-4">WELCOME TO THE VAULT</h1>
        <p className="text-vault-dim text-sm mb-8 leading-relaxed">
          Let's set up your profile and get you started on your performance journey.
        </p>
        <button
          onClick={handleComplete}
          className="bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
        >
          CONTINUE TO AUDIT
        </button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
