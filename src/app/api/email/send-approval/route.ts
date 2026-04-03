import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.HR_EMAIL_USER,
    pass: process.env.HR_EMAIL_PASS,
  },
});

export async function POST(req: NextRequest) {
  const { to, name, employeeId, tempPassword } = await req.json();

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Welcome to EcomHutsy</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f7f6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        
        <div style="background: linear-gradient(135deg, #10b981, #0d9488); padding: 40px 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎉 Welcome to EcomHutsy!</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Your application has been approved</p>
        </div>
        
        <div style="padding: 40px 32px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">Dear <strong>${name}</strong>,</p>
          
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
            We're excited to welcome you to the EcomHutsy team! Your application has been reviewed and approved by our HR team. Below are your login credentials to access the platform.
          </p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <p style="color: #166534; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px;">Your Login Credentials</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 8px 0; width: 140px;">Employee ID:</td>
                <td style="color: #111827; font-weight: 600; font-size: 14px; font-family: monospace;">${employeeId}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Email:</td>
                <td style="color: #111827; font-weight: 600; font-size: 14px;">${to}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Temp Password:</td>
                <td style="color: #111827; font-weight: 700; font-size: 16px; font-family: monospace; background: #dcfce7; padding: 4px 10px; border-radius: 6px;">${tempPassword}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 32px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              ⚠️ <strong>Important:</strong> You will be required to change this password immediately upon first login. Keep these credentials secure.
            </p>
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981, #0d9488); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Login to EcomHutsy →
          </a>
        </div>
        
        <div style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">
            This is an automated message from EcomHutsy HR Team. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"EcomHutsy HR" <${process.env.HR_EMAIL_USER}>`,
      to,
      subject: `🎉 Welcome to EcomHutsy — Your Account is Ready`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approval email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
