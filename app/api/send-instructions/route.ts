import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
});

const emailTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 600; }
    .logo-orange { color: #EA580C; }
    h1 { color: #111; font-size: 22px; }
    .step { background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .step-number { display: inline-block; width: 24px; height: 24px; background: #EA580C; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 8px; }
    .step-title { font-weight: 600; color: #111; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
    .cta { display: inline-block; background: #EA580C; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .email-box { background: #FFF7ED; border: 1px solid #EA580C; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
    .email-address { font-size: 18px; font-weight: 600; color: #EA580C; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><span class="logo-orange">Soul</span>Print</div>
  </div>

  <h1>Hey ${name}! Here's how to import your ChatGPT memory 🧠</h1>
  
  <p>Follow these 3 simple steps to give your AI perfect memory of all your past conversations:</p>

  <div class="step">
    <span class="step-number">1</span>
    <span class="step-title">Export your ChatGPT data</span>
    <p style="margin: 8px 0 0 32px;">
      Go to <a href="https://chat.openai.com">chat.openai.com</a> → Settings → Data Controls → Export data<br>
      Click "Export" and wait for the email from OpenAI (usually 5-30 minutes).
    </p>
  </div>

  <div class="step">
    <span class="step-number">2</span>
    <span class="step-title">Download the ZIP file</span>
    <p style="margin: 8px 0 0 32px;">
      When you get the email from OpenAI, download the ZIP file. Don't unzip it!
    </p>
  </div>

  <div class="step">
    <span class="step-number">3</span>
    <span class="step-title">Forward the ZIP to us</span>
    <p style="margin: 8px 0 0 32px;">
      Create a new email, attach the ZIP file, and send it to:
    </p>
  </div>

  <div class="email-box">
    <div class="email-address">waitlist@archeforge.com</div>
    <p style="margin: 8px 0 0; font-size: 14px; color: #666;">Just attach the ZIP and hit send — no subject or message needed!</p>
  </div>

  <p><strong>What happens next?</strong></p>
  <p>We'll process your conversations and build your AI memory. This usually takes about 5 minutes. We'll send you another email when it's ready!</p>

  <div class="footer">
    <p>🔒 Your data is encrypted and never shared with third parties.</p>
    <p>Questions? Just reply to this email.</p>
    <p>— The SoulPrint Team</p>
  </div>
</body>
</html>
`;

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userEmail = user.email;
    const userName = user.user_metadata?.name || user.user_metadata?.full_name || 'there';

    if (!userEmail) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"SoulPrint" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: '🧠 Your ChatGPT Import Instructions',
      html: emailTemplate(userName),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
