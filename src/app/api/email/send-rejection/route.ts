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
  const { to, name, reason } = await req.json();

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Application Update — EcomHutsy</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f7f6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        
        <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 40px 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Application Status Update</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">EcomHutsy HR Team</p>
        </div>
        
        <div style="padding: 40px 32px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Dear <strong>${name}</strong>,</p>
          
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Thank you for submitting your employment application to EcomHutsy. After careful review, we regret to inform you that we are unable to proceed with your application at this time.
          </p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
            <p style="color: #991b1b; font-weight: 700; font-size: 14px; margin: 0 0 8px;">Reason for Rejection:</p>
            <p style="color: #7f1d1d; font-size: 14px; line-height: 1.6; margin: 0;">${reason}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            If you believe this decision was made in error, or if you would like to reapply after addressing the above concerns, please contact our HR department.
          </p>
          
          <div style="background: #f9fafb; border-radius: 10px; padding: 16px;">
            <p style="color: #374151; font-size: 14px; margin: 0; font-weight: 600;">HR Contact:</p>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">${process.env.HR_EMAIL_USER}</p>
          </div>
        </div>
        
        <div style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">
            This is an automated message from EcomHutsy HR Team.
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
      subject: `Application Status Update — EcomHutsy`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Rejection email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
