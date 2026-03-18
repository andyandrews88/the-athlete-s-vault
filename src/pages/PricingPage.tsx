import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const PRICE_IDS: Record<string, string> = {
  basic: 'price_basic_placeholder',
  pro: 'price_pro_placeholder',
  elite: 'price_elite_placeholder',
};

const plans = [
  {
    key: 'basic',
    name: 'BASIC',
    tagline: 'THE FOUNDATION',
    price: '25',
    features: [
      'Movement audit & baseline score',
      'Weekly AI-generated review',
      'Training logger + NTU tracking',
      'Hand portions nutrition',
      'Knowledge library — free forever',
      '10 AI prompts per day',
    ],
    popular: false,
    accent: 'primary',
  },
  {
    key: 'pro',
    name: 'PRO',
    tagline: 'THE SYSTEM',
    price: '45',
    features: [
      'Everything in Basic',
      '1-on-1 coaching access',
      'Personalised programme',
      'PT session tracking',
      'Priority community access',
      'Unlimited AI prompts',
    ],
    popular: true,
    accent: 'primary',
  },
  {
    key: 'elite',
    name: 'ELITE',
    tagline: 'FULL ACCESS',
    price: '97',
    features: [
      'Everything in Pro',
      'Weekly video check-in with Andy',
      'Custom nutrition targets',
      'InBody scan analysis',
      'Direct WhatsApp access',
      'Unlimited everything',
    ],
    popular: false,
    accent: 'gold',
  },
];

const faqs = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel anytime from Settings. No contracts, no hidden fees.',
  },
  {
    q: "What's in the free plan?",
    a: 'Full knowledge library, movement audit, training logger, and 2 AI prompts per day. Forever free.',
  },
  {
    q: 'How does AI coaching work?',
    a: "Trained on Andy's methodology with access to your actual training data. Direct, evidence-based, no fluff.",
  },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'cancel'; msg: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setBanner({ type: 'success', msg: '🎉 Welcome to The Vault! Your plan is now active.' });
      setTimeout(() => setBanner(null), 5000);
    } else if (searchParams.get('cancelled') === 'true') {
      setBanner({ type: 'cancel', msg: 'No worries — upgrade anytime from Settings.' });
      setTimeout(() => setBanner(null), 3000);
    }
  }, [searchParams]);

  const handleGetStarted = async (tierKey: string) => {
    if (!user || !profile) {
      navigate('/auth');
      return;
    }

    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: PRICE_IDS[tierKey],
          userId: user.id,
          userEmail: profile.email,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen px-4 py-20" style={{ background: 'hsl(var(--bg))' }}>
      {banner && (
        <div
          className="fixed top-0 left-0 right-0 z-50 text-center py-3 px-4 text-xs font-semibold animate-fade-in"
          style={{
            background:
              banner.type === 'success'
                ? 'hsl(var(--ok) / 0.1)'
                : 'hsl(var(--warn) / 0.1)',
            borderBottom:
              banner.type === 'success'
                ? '1px solid hsl(var(--ok) / 0.2)'
                : '1px solid hsl(var(--warn) / 0.2)',
            color:
              banner.type === 'success'
                ? 'hsl(var(--ok))'
                : 'hsl(var(--warn))',
          }}
        >
          {banner.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
          className="flex items-center gap-2 mb-6 p-0"
        >
          <ArrowLeft size={18} style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-xs" style={{ color: 'hsl(var(--dim))' }}>
            Back
          </span>
        </button>

        <h1
          className="font-display text-center mb-2"
          style={{ fontSize: '36px', letterSpacing: '0.04em', color: 'hsl(var(--text))' }}
        >
          CHOOSE YOUR PATH
        </h1>
        <p
          className="text-center mb-8"
          style={{ fontSize: '13px', color: 'hsl(var(--dim))' }}
        >
          All plans include your movement audit and access to the knowledge library
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isGold = plan.accent === 'gold';
            const accentColor = isGold ? 'hsl(var(--gold))' : 'hsl(var(--primary))';

            return (
              <div
                key={plan.key}
                className="relative flex flex-col"
                style={{
                  background: plan.popular
                    ? 'linear-gradient(135deg, hsla(192,91%,54%,0.07), hsl(var(--bg2)))'
                    : 'hsl(var(--bg2))',
                  border: plan.popular
                    ? '1px solid hsla(192,91%,54%,0.3)'
                    : '1px solid hsl(var(--border))',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                {plan.popular && (
                  <span
                    className="absolute font-mono"
                    style={{
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'hsl(var(--primary))',
                      color: 'hsl(220,16%,6%)',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '4px 16px',
                      borderRadius: '20px',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    MOST POPULAR
                  </span>
                )}

                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.12em',
                    color: isGold ? 'hsl(var(--gold))' : plan.popular ? accentColor : 'hsl(var(--dim))',
                    marginBottom: '2px',
                  }}
                >
                  {plan.tagline}
                </p>

                <h3
                  className="font-display"
                  style={{ fontSize: '28px', letterSpacing: '0.04em', color: 'hsl(var(--text))' }}
                >
                  {plan.name}
                </h3>

                <div className="mb-6">
                  <span
                    className="font-display"
                    style={{ fontSize: '48px', color: accentColor }}
                  >
                    £{plan.price}
                  </span>
                  <span style={{ fontSize: '14px', color: 'hsl(var(--dim))' }}>/mo</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2" style={{ fontSize: '12px', color: 'hsl(var(--mid))' }}>
                      <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(var(--ok))' }} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleGetStarted(plan.key)}
                  disabled={loadingTier === plan.key}
                  className="w-full py-3 rounded-lg text-sm transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{
                    fontWeight: 700,
                    ...(plan.popular
                      ? {
                          background: 'hsl(var(--primary))',
                          color: 'hsl(220,16%,6%)',
                        }
                      : {
                          background: 'transparent',
                          border: `1px solid ${accentColor}`,
                          color: accentColor,
                        }),
                  }}
                >
                  {loadingTier === plan.key ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                  ) : (
                    'Get Started'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center mt-4" style={{ fontSize: '11px', color: 'hsl(var(--dim))' }}>
          Based in Sri Lanka? Prices in LKR available.
        </p>

        <div className="mt-12 max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} style={{ borderColor: 'hsl(var(--border))' }}>
                <AccordionTrigger
                  className="text-left"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--text))' }}
                >
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent style={{ fontSize: '12px', color: 'hsl(var(--mid))', padding: '8px 0' }}>
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
