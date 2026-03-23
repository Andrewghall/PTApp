import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0';

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { clientId, packId, credits } = session.metadata || {};

    if (!clientId || !credits) {
      console.error('Missing metadata in checkout session');
      return new Response('Missing metadata', { status: 400 });
    }

    const creditCount = parseInt(credits);
    const stripeSessionId = session.id;
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

    // Idempotency check - don't process the same session twice
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_checkout_session_id', stripeSessionId)
      .single();

    if (existingPayment) {
      console.log('Payment already processed:', stripeSessionId);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Add credits to client balance
    const { data: currentBalance } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('client_id', clientId)
      .single();

    const newBalance = (currentBalance?.balance || 0) + creditCount;

    await supabase
      .from('credit_balances')
      .upsert({ client_id: clientId, balance: newBalance }, { onConflict: 'client_id' });

    // 2. Log the credit transaction
    await supabase
      .from('credit_transactions')
      .insert({
        client_id: clientId,
        type: 'purchase',
        amount: creditCount,
        description: `Purchased ${creditCount} session${creditCount > 1 ? 's' : ''} via Stripe`,
      });

    // 3. Record payment
    await supabase
      .from('payments')
      .insert({
        client_id: clientId,
        credit_pack_id: packId || null,
        amount: session.amount_total || 0,
        status: 'completed',
        payment_method: 'stripe',
        stripe_checkout_session_id: stripeSessionId,
        stripe_payment_intent_id: paymentIntentId,
      });

    // 4. Increment payment count for bank account alternation
    const { data: countSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'stripe_payment_count')
      .single();

    const newCount = (parseInt(String(countSetting?.value || '0')) + 1);
    await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(newCount) })
      .eq('key', 'stripe_payment_count');

    // 5. Alternate payout destination between the two configured bank accounts
    try {
      // Read bank account IDs from app_settings (set via the app), fall back to env vars
      const { data: bankSetting1 } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'bank_account_id_1')
        .single();
      const { data: bankSetting2 } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'bank_account_id_2')
        .single();

      const bankAccount1 = bankSetting1?.value
        ? String(bankSetting1.value).replace(/"/g, '')
        : Deno.env.get('BANK_ACCOUNT_ID_1');
      const bankAccount2 = bankSetting2?.value
        ? String(bankSetting2.value).replace(/"/g, '')
        : Deno.env.get('BANK_ACCOUNT_ID_2');

      if (bankAccount1 && bankAccount2) {
        const targetBankId = newCount % 2 === 1 ? bankAccount1 : bankAccount2;
        const slotLabel = newCount % 2 === 1 ? '1' : '2';

        // Set the target bank account as default for EUR so next payout goes there
        const account = await stripe.accounts.retrieve();
        await stripe.accounts.updateExternalAccount(account.id, targetBankId, {
          default_for_currency: true,
        });
        console.log(`Payment #${newCount}: set bank account ${slotLabel} (${targetBankId}) as default payout`);
      }
    } catch (bankErr: any) {
      console.error('Bank alternation error (non-fatal):', bankErr.message);
    }

    // 6. Create notification for client
    await supabase
      .from('slot_notifications')
      .insert({
        client_id: clientId,
        notification_type: 'payment_confirmed',
        message: `Payment confirmed! ${creditCount} session${creditCount > 1 ? 's' : ''} added to your account.`,
      });

    console.log(`Successfully processed payment: ${creditCount} credits for client ${clientId}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
