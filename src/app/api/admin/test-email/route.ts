import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY || 're_stub_key');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetEmail } = body;

    const emailToSend = targetEmail || process.env.ADMIN_EMAIL || 'rawy.me.ai@gmail.com';
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Rawy <noreply@rawytime.com>';
    const sampleOrderNumber = 'RWY-' + Math.random().toString(36).substr(2, 7).toUpperCase();

    const sampleHtml = `
      <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #FFF9F0; color: #001A40; border-radius: 28px; border: 1px solid rgba(0, 26, 64, 0.06); direction: ltr; text-align: left;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 44px;">✨📖</span>
        </div>
        <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 12px; text-align: center;">Rawy Notification System Test ✅</h2>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Hi Rawy Team,</p>
        <p style="font-size: 16px; line-height: 1.7; color: #2D3748; margin-bottom: 20px;">
          This is a live test verifying that your email infrastructure (Resend + domain <strong>rawytime.com</strong>) is active and properly routing notifications!
        </p>
        
        <div style="background: linear-gradient(135deg, rgba(0,107,93,0.06) 0%, rgba(247,143,80,0.08) 100%); padding: 22px; border-radius: 20px; margin: 24px 0; border: 1px dashed rgba(0, 107, 93, 0.25);">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #4A5568;"><strong>📦 Sample Order:</strong> <span style="font-family: monospace; font-weight: 700; color: #006B5D;">#${sampleOrderNumber}</span></p>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #4A5568;"><strong>🌟 Story:</strong> The Lost Compass of Sahara</p>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #4A5568;"><strong>⭐ Hero:</strong> Leo</p>
          <p style="margin: 0; font-size: 14px; color: #4A5568;"><strong>📅 Test Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://rawytime.com/?story=${sampleOrderNumber}" style="background-color: #F78F50; color: white; padding: 14px 32px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(247, 143, 80, 0.3);">
            🚀 View Sample Story Link
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
        <p style="font-size: 12px; color: #A0AEC0; text-align: center; margin: 0;">Rawy Platform • Where Every Child Becomes the Hero.</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: emailToSend,
      subject: `[TEST] Rawy Order System Notification (#${sampleOrderNumber}) 🧪✨`,
      html: sampleHtml
    });

    if (error) {
      console.error('[Admin Test Email Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${emailToSend}!`,
      messageId: data?.id,
      fromAddress
    });
  } catch (err: any) {
    console.error('[Admin Test Email Catch]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
