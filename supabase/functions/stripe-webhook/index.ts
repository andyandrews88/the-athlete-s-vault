import Stripe from 'https://esm.sh/stripe@13.3.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const priceId = session.line_items?.data?.[0]?.price?.id ?? '';

    const tierMap: Record<string, string> = {
      'price_basic_placeholder': 'basic',
      'price_pro_placeholder': 'pro',
      'price_elite_placeholder': 'elite',
    };
    const tier = tierMap[priceId] ?? 'basic';

    await supabase.from('profiles')
      .update({ tier })
      .eq('id', userId);

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      stripe_price_id: priceId,
      tier,
      status: 'active',
      updated_at: new Date().toISOString(),
    });
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
