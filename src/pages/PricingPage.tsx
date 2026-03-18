import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';

const plans = [
  {
    name: 'Basic',
    tagline: 'The Foundation',
    price: '25',
    features: ['Movement audit & baseline score', 'Weekly programming', 'Exercise library access'],
    popular: false,
  },
  {
    name: 'Pro',
    tagline: 'The System',
    price: '45',
    features: ['Everything in Basic', 'NTU-based periodization', 'Nutrition tracking & macros'],
    popular: true,
  },
  {
    name: 'Elite',
    tagline: 'Full Access',
    price: '97',
    features: ['Everything in Pro', '1-on-1 coach check-ins', 'Priority community access'],
    popular: false,
  },
];

const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vault-bg px-4 py-20">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')} className="flex items-center gap-2 mb-6 p-0">
          <ArrowLeft size={18} className="text-primary" />
          <span className="text-xs" style={{ color: 'hsl(var(--dim))' }}>Back</span>
        </button>
        <h1 className="font-display text-5xl tracking-wide text-center mb-4">CHOOSE YOUR PATH</h1>
        <p className="text-vault-dim text-center mb-12 text-sm">All plans include your initial movement audit</p>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative bg-vault-bg2 border rounded-xl p-8 flex flex-col ${
                plan.popular ? 'border-primary' : 'border-vault-border'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold tracking-wider px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <p className="text-vault-dim text-xs font-mono uppercase tracking-wider mb-1">{plan.tagline}</p>
              <h3 className="font-display text-3xl tracking-wide mb-2">{plan.name}</h3>
              <p className="text-vault-text text-3xl font-bold mb-6">
                £{plan.price}<span className="text-vault-dim text-sm font-normal">/mo</span>
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-vault-mid">
                    <Check size={16} className="text-vault-ok mt-0.5 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.97] ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:scale-[1.02]'
                    : 'bg-vault-bg3 text-vault-text border border-vault-border2 hover:bg-vault-bg4'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
