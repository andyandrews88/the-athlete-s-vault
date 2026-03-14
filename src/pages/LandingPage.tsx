import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Link2, Unlock, Dumbbell, UtensilsCrossed, BookOpen, BarChart3, Target } from 'lucide-react';

const featureCards = [
  { icon: Shield, emoji: '🛡️', title: 'Coach-Built', desc: 'A decade of real coaching, not a product team chasing features.' },
  { icon: Link2, emoji: '🔗', title: 'Everything Connected', desc: 'Your readiness score shapes your training. No more juggling five apps.' },
  { icon: Unlock, emoji: '🔓', title: 'Free. No Paywall.', desc: 'Core tracking is completely free from day one.' },
];

const features = [
  { emoji: '🏋️', title: 'Training Log', desc: 'Log workouts, PRs, volume trends' },
  { emoji: '🥗', title: 'Nutrition Tracker', desc: 'Macros, barcode scanner, hand portions' },
  { emoji: '📚', title: 'Knowledge Library', desc: 'Curated resources, free, no paywall' },
  { emoji: '📊', title: 'Progress Tracking', desc: 'Weight, measurements, photos, InBody' },
  { emoji: '🎯', title: 'Fitness Audit', desc: 'Find gaps in training, nutrition, recovery' },
];

const tiers = [
  { name: '1-on-1 Online Coaching', price: 'LKR 60k/mo', desc: 'Fully personalised programme', active: true },
  { name: 'PT Session', price: 'LKR 15k', desc: 'In-person training', active: false },
  { name: 'Pre-built Programme', price: 'LKR 8.2k/mo', desc: 'Self-directed', active: false },
];

const ease = [0.16, 1, 0.3, 1] as const;

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[70vh] pointer-events-none"
          style={{ background: 'radial-gradient(circle at center, hsla(192,91%,54%,0.08) 0%, transparent 70%)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="relative z-10 flex flex-col items-center text-center max-w-2xl"
        >
          <span className="font-display text-primary text-lg tracking-[4px] mb-8">THE VAULT</span>
          <h1 className="font-display text-[clamp(40px,8vw,72px)] leading-[0.95] text-foreground mb-6 tracking-[2px]">
            ONE PLACE.<br />EVERYTHING YOU NEED.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mb-10 leading-relaxed">
            Stop juggling five different apps. The Vault brings training, nutrition, and lifestyle into one place.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full sm:w-auto bg-primary text-primary-foreground font-bold text-sm tracking-wider px-10 py-4 rounded-lg hover:scale-[1.02] active:scale-[0.97] transition-transform"
          >
            BEGIN YOUR AUDIT
          </button>
        </motion.div>
      </section>

      {/* BUILT FROM FRUSTRATION */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <h2 className="font-display text-3xl md:text-4xl tracking-wide mb-4">
            BUILT FROM <span className="text-primary">FRUSTRATION</span>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-10">
            I built The Vault because I was tired of the fragmentation. One app for calories. Another for training. A third for check-ins. None of them talking to each other.
          </p>
        </motion.div>

        <div className="space-y-4">
          {featureCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              className="bg-card border border-border rounded-xl p-5 flex items-start gap-4"
            >
              <span className="text-2xl shrink-0">{card.emoji}</span>
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{card.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-24">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display text-3xl md:text-4xl tracking-wide text-center mb-12"
        >
          FEATURES
        </motion.h2>
        <div className="space-y-4">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease }}
              className="flex items-center gap-4 py-3 border-b border-border last:border-b-0"
            >
              <span className="text-2xl shrink-0">{f.emoji}</span>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                <p className="text-muted-foreground text-xs">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* COACHING TIERS */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-24">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-display text-3xl md:text-4xl tracking-wide text-center mb-12"
        >
          COACHING TIERS
        </motion.h2>
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              className={`rounded-xl p-5 border ${
                tier.active
                  ? 'border-primary bg-vault-pgb'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground text-sm">{tier.name}</h3>
                <span className="font-mono text-primary text-xs">{tier.price}</span>
              </div>
              <p className="text-muted-foreground text-xs">{tier.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-8 text-muted-foreground text-xs">
        © The Vault by Andy Andrews
      </footer>
    </div>
  );
};

export default LandingPage;
