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
  const { name, email, submissionId } = await req.json();

  const to = process.env.HR_NOTIFICATION_EMAIL;
  if (!to) {
    return NextResponse.json({ error: "HR_NOTIFICATION_EMAIL not set" }, { status: 500 });
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>New Pending Application — EcomHutsy</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f7f6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        
        <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 40px 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">New Pending Application</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">Employee Onboarding Portal</p>
        </div>
        
        <div style="padding: 40px 32px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hello HR Team,</p>
          
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            A new employee registration application has been submitted and is waiting for your review.
          </p>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
            <p style="color: #0369a1; font-weight: 700; font-size: 14px; margin: 0 0 8px;">Applicant Details:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 120px;">Name:</td>
                <td style="color: #111827; font-weight: 600; font-size: 14px;">${name}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Email:</td>
                <td style="color: #111827; font-weight: 600; font-size: 14px;">${email}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Reference ID:</td>
                <td style="color: #111827; font-weight: 600; font-size: 14px; font-family: monospace;">${submissionId}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Please log in to the HR Dashboard to review their form and documents, and decide whether to approve or reject the application.
          </p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/hr" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Go to HR Dashboard →
          </a>
        </div>
        
        <div style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">
            This is an automated notification from the EcomHutsy Registration System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"EcomHutsy System" <${process.env.HR_EMAIL_USER}>`,
      to,
      subject: `New Application from ${name}`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("HR notification email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
