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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
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

    const { email, firstName, lastName, phone, dateOfBirth, gender } = await req.json();

    if (!email || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'Email, first name and last name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate an invite link — creates the user and returns the action URL
    // We send the email ourselves via Resend for reliability
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || '',
          date_of_birth: dateOfBirth || '',
          gender: gender || null,
        },
        redirectTo: 'https://elevategym.pt/app/',
      },
    });

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inviteUrl = linkData.properties?.action_link;

    // Wait briefly for DB trigger to create profiles/client_profiles
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send welcome email via Resend with the invite link
    let emailSent = false;
    let emailError = '';

    if (resendApiKey && inviteUrl) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #c8a94e; margin: 0;">ELEVATE GYM</h1>
              <p style="color: #9ca3af; font-size: 14px;">Stronger at Every Age</p>
            </div>

            <h2 style="color: #ffffff; font-size: 24px;">Welcome to Elevate Gym, ${firstName}!</h2>

            <p style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
              Your account has been created. Click the button below to set your password and start booking sessions.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: #c8a94e; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                Set Your Password
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              This link expires in 24 hours. If you didn't expect this email, you can ignore it.
            </p>

            <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px;">
              Questions? Contact us at +351 926 930 575
            </p>
          </div>
        `;

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Elevate Gym <noreply@send.elevategym.pt>',
            to: [email],
            subject: `Welcome to Elevate Gym, ${firstName} — Set Your Password`,
            html: emailHtml,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
        } else {
          const body = await resendRes.text();
          emailError = `Resend ${resendRes.status}: ${body}`;
          console.error('Resend error:', emailError);
        }
      } catch (err: any) {
        emailError = err.message;
        console.error('Email send failed:', emailError);
      }
    } else if (!resendApiKey) {
      emailError = 'RESEND_API_KEY not set';
    }

    return new Response(JSON.stringify({
      success: true,
      userId: linkData.user?.id,
      emailSent,
      emailError: emailError || undefined,
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
