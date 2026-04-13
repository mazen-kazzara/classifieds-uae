import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@classifiedsuae.ae";
const OTP_MOCK = (process.env.OTP_MOCK || "false").toLowerCase() === "true";

export async function sendEmailOtp(
  email: string,
  code: string
): Promise<{ ok: boolean; mockCode?: string; error?: string }> {
  if (OTP_MOCK) {
    console.log(`[EMAIL OTP MOCK] email=${email} code=${code}`);
    return { ok: true, mockCode: code };
  }

  if (!SMTP_USER || !SMTP_PASS) {
    console.error("EMAIL OTP: SMTP_USER or SMTP_PASS not set");
    return { ok: false, error: "SMTP not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"Classifieds UAE" <${SMTP_FROM}>`,
      to: email,
      subject: "Your Classifieds UAE verification code",
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#10B981;margin-bottom:8px;">Classifieds UAE</h2>
          <p style="color:#333;font-size:15px;">Your verification code is:</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#111;">${code}</span>
          </div>
          <p style="color:#666;font-size:13px;">This code expires in 10 minutes.</p>
          <p style="color:#999;font-size:12px;margin-top:24px;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`EMAIL OTP sent to ${email}`);
    return { ok: true };
  } catch (e: any) {
    console.error("EMAIL OTP send error:", e.message);
    return { ok: false, error: e.message };
  }
}
