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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized: ' + (authError?.message || 'invalid token') }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { iban, accountHolderName, bankAccountSlot } = await req.json();

    if (!iban || !accountHolderName || ![1, 2].includes(bankAccountSlot)) {
      return new Response(JSON.stringify({ error: 'IBAN, accountHolderName, and bankAccountSlot (1 or 2) are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanIban = iban.replace(/\s/g, '').toUpperCase();

    // Get the platform Stripe account
    const account = await stripe.accounts.retrieve();

    // Create a bank account token from IBAN
    const bankToken = await stripe.tokens.create({
      bank_account: {
        country: 'PT',
        currency: 'eur',
        account_holder_name: accountHolderName,
        account_holder_type: 'individual',
        iban: cleanIban,
      },
    } as any);

    // Attach the bank account to the Stripe account as an external account
    const externalAccount = await stripe.accounts.createExternalAccount(account.id, {
      external_account: bankToken.id,
    }) as any;

    const bankAccountId = externalAccount.id;
    const last4 = externalAccount.last4 || cleanIban.slice(-4);

    // Save to app_settings so the webhook can read it
    const settingKey = `bank_account_id_${bankAccountSlot}`;
    await supabase
      .from('app_settings')
      .upsert(
        {
          key: settingKey,
          value: JSON.stringify(bankAccountId),
          description: `Stripe bank account ${bankAccountSlot} for payout alternation (last4: ${last4})`,
          updated_at: new Date().toISOString(),
          updated_by: caller.id,
        },
        { onConflict: 'key' }
      );

    return new Response(JSON.stringify({ success: true, bankAccountId, last4 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('setup-bank-account error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
