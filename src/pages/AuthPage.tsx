import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const AuthPage = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password, fullName);
        navigate('/onboarding');
      } else {
        const { user } = await signIn(email, password);
        if (user) {
          // Fetch profile for redirect logic
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (prof && !prof.onboarding_complete) navigate('/onboarding');
          else if (prof && prof.audit_score === null) navigate('/audit');
          else navigate('/home');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-vault-bg2 border border-vault-border2 rounded-2xl p-8">
        <h1 className="font-display text-3xl tracking-wider text-center mb-6 text-primary">THE VAULT</h1>

        {/* Toggle */}
        <div className="flex bg-vault-bg3 rounded-lg p-1 mb-8">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                mode === m ? 'bg-vault-bg4 text-vault-text' : 'text-vault-dim'
              }`}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-vault-bg3 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
                placeholder="Andy Andrews"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-vault-bg3 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-vault-dim mb-1.5 font-mono uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-vault-bg3 border border-vault-border2 rounded-lg px-4 py-3 text-sm text-vault-text placeholder:text-vault-dim focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-vault-bad">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
