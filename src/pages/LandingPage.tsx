import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Cpu, Brain } from 'lucide-react';
import { Check } from 'lucide-react';

const features = [
  { title: 'THE AUDIT', desc: 'Movement screening that scores your actual baseline.', icon: Shield },
  { title: 'THE SYSTEM', desc: 'NTU-based programming built around your patterns.', icon: Cpu },
  { title: 'THE COACH', desc: 'AI that thinks like Andy. Data that proves it\'s working.', icon: Brain },
];

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

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-vault-bg relative overflow-hidden">
      {/* Radial Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, hsla(192,91%,54%,0.1) 0%, transparent 70%)' }}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-[15vh] pb-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center"
        >
          <span className="font-mono text-[11px] tracking-[0.3em] text-primary mb-6">
            PERFORMANCE ARCHITECTURE
          </span>
          <h1 className="font-display text-[clamp(52px,8vw,88px)] leading-[0.9] text-vault-text mb-8 tracking-[3px]">
            BUILT FOR ATHLETES<br />WHO REFUSE TO GUESS
          </h1>
          <p className="text-vault-mid text-lg max-w-2xl mb-12">
            Andy Andrews <span className="mx-2 opacity-30">|</span> 6-Time Fittest Man in Sri Lanka <span className="mx-2 opacity-30">|</span> CrossFit Games Athlete
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-all"
          >
            BEGIN YOUR AUDIT
          </button>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-32">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-vault-bg2 border border-vault-border p-8 rounded-xl"
            >
              <f.icon size={24} className="text-primary mb-4" />
              <h3 className="font-display text-2xl tracking-wide mb-3">{f.title}</h3>
              <p className="text-vault-dim text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Pricing */}
        <div className="mt-32">
          <h2 className="font-display text-4xl tracking-wide text-center mb-4">CHOOSE YOUR PATH</h2>
          <p className="text-vault-dim text-center mb-12 text-sm">All plans include your initial movement audit</p>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
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
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-vault-dim text-xs">
        © The Vault by Andy Andrews
      </footer>
    </div>
  );
};

export default LandingPage;
