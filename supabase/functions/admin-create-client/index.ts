import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to verify the user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized: ' + (authError?.message || 'invalid token') }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller is admin
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

    const { email, firstName, lastName, phone, dateOfBirth, gender } = await req.json();

    if (!email || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'Email, first name and last name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a temporary password
    const tempPassword = `Elevate${Math.random().toString(36).slice(2, 10)}!`;

    // Create the user via admin API (no email confirmation needed)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
        date_of_birth: dateOfBirth || '',
        gender: gender || null,
        must_reset_password: true,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // The DB trigger should auto-create profiles, client_profiles, credit_balances
    // Wait a moment for the trigger to fire
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send welcome email via Resend
    if (resendApiKey) {
      try {
        const appUrl = 'https://elevategym.pt/app/';
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #c8a94e; margin: 0;">ELEVATE GYM</h1>
              <p style="color: #9ca3af; font-size: 14px;">Stronger at Every Age</p>
            </div>

            <h2 style="color: #ffffff; font-size: 24px;">Welcome to Elevate Gym, ${firstName}!</h2>

            <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
              Your account has been created. You can now log in to book sessions, track your progress, and manage your training.
            </p>

            <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="color: #9ca3af; margin: 0 0 8px 0; font-size: 14px;">Your login details:</p>
              <p style="color: #ffffff; margin: 0 0 4px 0;"><strong>Email:</strong> ${email}</p>
              <p style="color: #ffffff; margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
            </div>

            <p style="color: #f59e0b; font-size: 14px; font-weight: 600;">
              Please change your password after your first login.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" style="background: #c8a94e; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                Log In Now
              </a>
            </div>

            <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px;">
              If you have any questions, contact us at +351 926 930 575
            </p>
          </div>
        `;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Elevate Gym <noreply@send.elevategym.pt>',
            to: [email],
            subject: 'Welcome to Elevate Gym - Your Account Details',
            html: emailHtml,
          }),
        });
      } catch (emailError: any) {
        console.error('Failed to send welcome email:', emailError.message);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      userId: newUser.user?.id,
      tempPassword,
      emailSent: !!resendApiKey,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
