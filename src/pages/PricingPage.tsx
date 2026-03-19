import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const PRICE_IDS: Record<string, string> = {
  premium: 'price_1TCbVvFU44mZaz2gwkQqgsZG',
  coaching: 'price_1OadDFFU44mZaz2ge4flevwr',
  pt_single: 'price_1QHjI6FU44mZaz2gs8WvUHDt',
  pt_pack_6: 'price_1SoMDwFU44mZaz2g1si6OA5s',
  pt_pack_12: 'price_1TCbk3FU44mZaz2gl0zv8Aep',
  consultation: 'price_1TCbeaFU44mZaz2gw4zC05pU',
};

const SUBSCRIPTION_KEYS = ['premium', 'coaching'];

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from Settings. No contracts, no hidden fees.' },
  { q: "What's in the free plan?", a: 'Full knowledge library, movement audit, training logger, community access, and 2 AI prompts per day. Forever free.' },
  { q: 'How does AI coaching work?', a: "Trained on Andy's methodology with access to your actual training data. Direct, evidence-based, no fluff." },
];

const FeatureRow = ({ text }: { text: string }) => (
  <li className="flex items-start gap-2" style={{ fontSize: '12px', color: 'hsl(var(--mid))' }}>
    <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'hsl(var(--ok))' }} />
    {text}
  </li>
);

const SectionDivider = () => (
  <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '40px 0' }} />
);

const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refetchProfile } = useAuth();
  const { toast } = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'cancel'; msg: string } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');
    const purchaseType = searchParams.get('type');

    if (success === 'true') {
      const msgs: Record<string, string> = {
        coaching: '🎉 Welcome to 1-on-1 Coaching! Andy will contact you within 24 hours.',
        premium: '🎉 You\'re now on Premium! All programmes are now unlocked.',
        pt: '✅ PT sessions booked! Andy will contact you to schedule.',
        consultation: '✅ Consultation booked! Andy will send you a booking link.',
      };
      setBanner({ type: 'success', msg: msgs[purchaseType ?? 'premium'] ?? msgs.premium });
      const retryFetch = (attempts: number) => {
        refetchProfile?.();
        if (attempts > 1) setTimeout(() => retryFetch(attempts - 1), 2000);
      };
      setTimeout(() => retryFetch(3), 1500);
      setTimeout(() => setBanner(null), 5000);
    } else if (cancelled === 'true') {
      setBanner({ type: 'cancel', msg: 'No worries — you can purchase anytime from this page.' });
      setTimeout(() => setBanner(null), 3000);
    }
  }, [searchParams]);

  const handleCheckout = async (key: string, successType: string) => {
    if (!user || !profile) { navigate('/auth'); return; }
    setLoadingKey(key);
    try {
      const mode = SUBSCRIPTION_KEYS.includes(key) ? 'subscription' : 'payment';
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PRICE_IDS[key], userId: user.id, userEmail: profile.email, mode, purchaseType: successType },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoadingKey(null);
    }
  };

  const CheckoutButton = ({ label, keyName, successType, variant = 'outline', accentVar = '--primary' }: {
    label: string; keyName: string; successType: string;
    variant?: 'filled' | 'outline'; accentVar?: string;
  }) => (
    <button
      onClick={() => handleCheckout(keyName, successType)}
      disabled={loadingKey === keyName}
      className="w-full py-3 rounded-lg text-sm transition-all active:scale-[0.97] disabled:opacity-60"
      style={{
        fontWeight: 700,
        ...(variant === 'filled'
          ? { background: `hsl(var(${accentVar}))`, color: 'hsl(220,16%,6%)' }
          : { background: 'transparent', border: `1px solid hsl(var(${accentVar}))`, color: `hsl(var(${accentVar}))` }),
      }}
    >
      {loadingKey === keyName ? <Loader2 size={16} className="animate-spin mx-auto" /> : label}
    </button>
  );

  return (
    <div className="min-h-screen px-4 py-20" style={{ background: 'hsl(var(--bg))' }}>
      {banner && (
        <div
          className="fixed top-0 left-0 right-0 z-50 text-center py-3 px-4 text-xs font-semibold animate-fade-in"
          style={{
            background: banner.type === 'success' ? 'hsl(var(--ok) / 0.1)' : 'hsl(var(--warn) / 0.1)',
            borderBottom: banner.type === 'success' ? '1px solid hsl(var(--ok) / 0.2)' : '1px solid hsl(var(--warn) / 0.2)',
            color: banner.type === 'success' ? 'hsl(var(--ok))' : 'hsl(var(--warn))',
          }}
        >
          {banner.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))} className="flex items-center gap-2 mb-6 p-0">
          <ArrowLeft size={18} style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-xs" style={{ color: 'hsl(var(--dim))' }}>Back</span>
        </button>

        <h1 className="font-display text-center mb-2" style={{ fontSize: '36px', letterSpacing: '0.04em', color: 'hsl(var(--text))' }}>WORK WITH ANDY</h1>
        <p className="text-center mb-10" style={{ fontSize: '13px', color: 'hsl(var(--dim))' }}>Choose how you want to train</p>

        {/* SECTION 1 — APP ACCESS */}
        <h2 className="font-display mb-5" style={{ fontSize: '22px', color: 'hsl(var(--primary))' }}>THE APP</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* FREE */}
          <div style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '24px' }}>
            <p className="font-mono uppercase" style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'hsl(var(--dim))', marginBottom: '2px' }}>FREE</p>
            <div className="mb-6">
              <span className="font-display" style={{ fontSize: '48px', color: 'hsl(var(--dim))' }}>$0</span>
              <p style={{ fontSize: '12px', color: 'hsl(var(--dim))' }}>forever</p>
            </div>
            <ul className="space-y-3 mb-8">
              {['Movement audit & baseline score', 'Training logger + NTU tracking', 'Hand portions nutrition', 'Knowledge library — full access', '1 free training programme', 'Community access', '2 AI prompts per day'].map((f, i) => <FeatureRow key={i} text={f} />)}
            </ul>
            <button
              onClick={() => navigate(user ? '/home' : '/auth')}
              className="w-full py-3 rounded-lg text-sm transition-all active:scale-[0.97]"
              style={{ fontWeight: 700, background: 'transparent', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--mid))' }}
            >
              Start Free
            </button>
          </div>

          {/* PREMIUM */}
          <div className="relative" style={{ background: 'linear-gradient(135deg, hsla(192,91%,54%,0.07), hsl(var(--bg2)))', border: '1px solid hsla(192,91%,54%,0.3)', borderRadius: '16px', padding: '24px' }}>
            <span className="absolute font-mono" style={{ top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontSize: '9px', fontWeight: 700, padding: '4px 16px', borderRadius: '20px', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>MOST POPULAR</span>
            <p className="font-mono uppercase" style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'hsl(var(--primary))', marginBottom: '2px' }}>PREMIUM</p>
            <div className="mb-6">
              <span className="font-display" style={{ fontSize: '48px', color: 'hsl(var(--primary))' }}>$15</span>
              <span style={{ fontSize: '14px', color: 'hsl(var(--dim))' }}>/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {['Everything in Free', 'ALL training programmes unlocked', '500 AI conversations per month', 'Advanced analytics & insights', 'Priority community access'].map((f, i) => <FeatureRow key={i} text={f} />)}
            </ul>
            <CheckoutButton label="Get Premium" keyName="premium" successType="premium" variant="filled" />
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 2 — 1-ON-1 COACHING */}
        <h2 className="font-display mb-5" style={{ fontSize: '22px', color: 'hsl(var(--gold))' }}>1-ON-1 COACHING</h2>
        <div style={{ background: 'hsl(var(--bg2))', border: '1px solid hsla(45,93%,58%,0.3)', borderRadius: '16px', padding: '24px' }}>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="font-mono uppercase" style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'hsl(var(--gold))', marginBottom: '2px' }}>THE FULL EXPERIENCE</p>
              <div className="mb-1">
                <span className="font-display" style={{ fontSize: '56px', color: 'hsl(var(--gold))' }}>$188</span>
                <span style={{ fontSize: '14px', color: 'hsl(var(--dim))' }}>/month</span>
              </div>
              <p className="font-mono" style={{ fontSize: '10px', color: 'hsl(var(--dim))', marginTop: '4px', marginBottom: '20px' }}>LKR 60,000 / month</p>
              <CheckoutButton label="Apply for Coaching" keyName="coaching" successType="coaching" variant="outline" accentVar="--gold" />
              <p className="text-center" style={{ fontSize: '10px', color: 'hsl(var(--dim))', marginTop: '8px' }}>Andy will contact you within 24 hours to schedule your onboarding call.</p>
            </div>
            <ul className="space-y-3">
              {['Everything in Premium', 'Custom programme built by Andy', 'Nutrition targets & meal planning', "Weekly AI review + Andy's notes", 'PT session tracking', 'Direct messaging with Andy', 'Full progress monitoring', 'Priority response within 24hrs'].map((f, i) => <FeatureRow key={i} text={f} />)}
            </ul>
          </div>
        </div>

        <SectionDivider />

        {/* SECTION 3 — PT SESSIONS */}
        <h2 className="font-display mb-2" style={{ fontSize: '22px', color: 'hsl(var(--text))' }}>IN-PERSON PT</h2>
        <p className="mb-5" style={{ fontSize: '11px', color: 'hsl(var(--dim))' }}>Colombo · Book sessions with Andy</p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Single */}
          <div className="text-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '20px' }}>
            <p className="font-mono uppercase" style={{ fontSize: '8px', letterSpacing: '0.12em', color: 'hsl(var(--dim))' }}>SINGLE</p>
            <p className="font-display" style={{ fontSize: '28px', color: 'hsl(var(--text))' }}>LKR 15,000</p>
            <p className="font-mono" style={{ fontSize: '11px', color: 'hsl(var(--dim))' }}>$46</p>
            <p style={{ fontSize: '11px', color: 'hsl(var(--dim))', marginTop: '4px', marginBottom: '16px' }}>1 session</p>
            <CheckoutButton label="Book Session" keyName="pt_single" successType="pt" />
          </div>

          {/* Pack of 6 */}
          <div className="text-center relative" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsla(192,91%,54%,0.2)', borderRadius: '16px', padding: '20px' }}>
            <span className="absolute font-mono" style={{ top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'hsl(var(--ok) / 0.1)', color: 'hsl(var(--ok))', border: '1px solid hsl(var(--ok) / 0.2)', fontSize: '8px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', whiteSpace: 'nowrap' }}>SAVE 10%</span>
            <p className="font-mono uppercase" style={{ fontSize: '8px', letterSpacing: '0.12em', color: 'hsl(var(--dim))' }}>6 SESSIONS</p>
            <p className="font-display" style={{ fontSize: '28px', color: 'hsl(var(--text))' }}>LKR 81,000</p>
            <p className="font-mono" style={{ fontSize: '11px', color: 'hsl(var(--dim))' }}>$249</p>
            <p className="font-mono" style={{ fontSize: '9px', color: 'hsl(var(--ok))', marginTop: '4px', marginBottom: '16px' }}>LKR 13,500 per session</p>
            <CheckoutButton label="Get Pack of 6" keyName="pt_pack_6" successType="pt" variant="filled" />
          </div>

          {/* Pack of 12 */}
          <div className="text-center relative" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsla(45,93%,58%,0.15)', borderRadius: '16px', padding: '20px' }}>
            <span className="absolute font-mono" style={{ top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'hsl(var(--gold) / 0.1)', color: 'hsl(var(--gold))', border: '1px solid hsl(var(--gold) / 0.2)', fontSize: '8px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', whiteSpace: 'nowrap' }}>BEST VALUE</span>
            <p className="font-mono uppercase" style={{ fontSize: '8px', letterSpacing: '0.12em', color: 'hsl(var(--dim))' }}>12 SESSIONS</p>
            <p className="font-display" style={{ fontSize: '28px', color: 'hsl(var(--text))' }}>LKR 144,000</p>
            <p className="font-mono" style={{ fontSize: '11px', color: 'hsl(var(--dim))' }}>$443</p>
            <p className="font-mono" style={{ fontSize: '9px', color: 'hsl(var(--gold))', marginTop: '4px', marginBottom: '16px' }}>LKR 12,000 per session</p>
            <CheckoutButton label="Get Pack of 12" keyName="pt_pack_12" successType="pt" variant="outline" accentVar="--gold" />
          </div>
        </div>
        <p className="text-center" style={{ fontSize: '11px', color: 'hsl(var(--dim))', marginTop: '12px' }}>
          Sessions are in-person in Colombo. After purchase Andy will contact you to schedule your sessions.
        </p>

        <SectionDivider />

        {/* SECTION 4 — CONSULTATION */}
        <h2 className="font-display mb-5" style={{ fontSize: '22px', color: 'hsl(var(--text))' }}>CONSULTATION CALL</h2>
        <div className="max-w-[400px] mx-auto text-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '24px' }}>
          <p className="font-mono uppercase" style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'hsl(var(--dim))' }}>30 MINUTES</p>
          <div className="mb-1">
            <span className="font-display" style={{ fontSize: '48px', color: 'hsl(var(--primary))' }}>$20</span>
          </div>
          <p style={{ fontSize: '12px', color: 'hsl(var(--dim))', marginBottom: '16px' }}>one-time</p>
          <ul className="space-y-3 mb-8 text-left">
            {['Training questions & programming advice', 'Nutrition guidance', 'Lifestyle & recovery review', 'Stress & sleep optimisation', 'Video call with Andy'].map((f, i) => <FeatureRow key={i} text={f} />)}
          </ul>
          <CheckoutButton label="Book a Call" keyName="consultation" successType="consultation" variant="filled" />
          <p className="text-center" style={{ fontSize: '10px', color: 'hsl(var(--dim))', marginTop: '8px' }}>Scheduled after purchase via Andy's booking link</p>
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} style={{ borderColor: 'hsl(var(--border))' }}>
                <AccordionTrigger className="text-left" style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--text))' }}>{faq.q}</AccordionTrigger>
                <AccordionContent style={{ fontSize: '12px', color: 'hsl(var(--mid))', padding: '8px 0' }}>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
