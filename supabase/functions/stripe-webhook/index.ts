import Stripe from 'https://esm.sh/stripe@13.3.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const tierMap: Record<string, string> = {
  'price_1TCbVvFU44mZaz2gwkQqgsZG': 'premium',
  'price_1OadDFFU44mZaz2ge4flevwr': 'coaching',
};

const ptPriceMap: Record<string, { sessions: number; price: number; currency: string }> = {
  'price_1QHjI6FU44mZaz2gs8WvUHDt': { sessions: 1, price: 15000, currency: 'LKR' },
  'price_1SoMDwFU44mZaz2g1si6OA5s': { sessions: 6, price: 13500, currency: 'LKR' },
  'price_1TCbk3FU44mZaz2gl0zv8Aep': { sessions: 12, price: 12000, currency: 'LKR' },
};

const consultationPriceId = 'price_1TCbeaFU44mZaz2gw4zC05pU';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  const stripe = new Stripe(
    Deno.env.get('STRIPE_SECRET_KEY') ?? '',
    { apiVersion: '2023-10-16' }
  );

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId ?? '';
    const purchaseType = session.metadata?.purchaseType ?? '';
    const sessionMode = session.mode;

    if (sessionMode === 'subscription') {
      // Subscription: update tier
      const tier = tierMap[priceId] ?? 'premium';

      await supabase.from('profiles').update({ tier }).eq('id', userId);

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        stripe_price_id: priceId,
        tier,
        status: 'active',
        updated_at: new Date().toISOString(),
      });
    } else if (sessionMode === 'payment') {
      // One-time: PT or consultation
      const ptConfig = ptPriceMap[priceId];
      if (ptConfig) {
        const packName = ptConfig.sessions === 1 ? 'Single Session' :
          ptConfig.sessions === 6 ? 'Pack of 6' : 'Pack of 12';

        await supabase.from('pt_packages').insert({
          client_id: userId,
          name: packName,
          sessions_total: ptConfig.sessions,
          price_per_session: ptConfig.price,
          currency: ptConfig.currency,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
        });
      } else if (priceId === consultationPriceId) {
        await supabase.from('coaching_applications').insert({
          user_id: userId,
          type: 'consultation',
          status: 'pending',
          stripe_session_id: session.id,
        });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as any;

    await supabase.from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', sub.id);

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', sub.id)
      .single();

    if (subData) {
      await supabase.from('profiles')
        .update({ tier: 'free' })
        .eq('id', subData.user_id);
    }
  }

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
