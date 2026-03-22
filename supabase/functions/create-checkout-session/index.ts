import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { packId, clientId } = await req.json();

    if (!packId || !clientId) {
      return new Response(JSON.stringify({ error: 'Missing packId or clientId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the credit pack
    const { data: pack, error: packError } = await supabase
      .from('credit_packs')
      .select('*')
      .eq('id', packId)
      .eq('is_active', true)
      .single();

    if (packError || !pack) {
      return new Response(JSON.stringify({ error: 'Credit pack not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the app base URL for redirects
    const origin = req.headers.get('origin') || 'https://elevategym.com';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${pack.credits} Training Sessions`,
              description: `Elevate Gym - ${pack.credits} session${pack.credits > 1 ? 's' : ''} pack`,
            },
            unit_amount: pack.price, // Already in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId,
        packId,
        credits: String(pack.credits),
      },
      success_url: `${origin}/app/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/?payment=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
