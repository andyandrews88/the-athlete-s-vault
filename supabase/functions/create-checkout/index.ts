import Stripe from 'https://esm.sh/stripe@13.3.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId, userId, userEmail } = await req.json();

    const stripe = new Stripe(
      Deno.env.get('STRIPE_SECRET_KEY') ?? '',
      { apiVersion: '2023-10-16' }
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/pricing?success=true`,
      cancel_url: `${req.headers.get('origin')}/pricing?cancelled=true`,
      metadata: { userId },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: corsHeaders }
    );
  }
});
