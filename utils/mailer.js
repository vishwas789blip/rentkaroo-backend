import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * Resend Client (HTTP API over Port 443 — No SMTP timeouts on Render Free)
 */
let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    resendClient = new Resend(process.env.RESEND_API_KEY.trim());
  }
  return resendClient;
}

/**
 * Singleton Nodemailer Transporter Instance (SMTP Fallback)
 */
let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = parseInt(process.env.SMTP_PORT || "2525", 10);
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();

  if (!user || !pass) {
    throw new Error("SMTP credentials missing in environment (SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS)");
  }

  const isSecure = port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

/**
 * Diagnostic verify helper
 */
export async function verifyMailer() {
  const resend = getResendClient();
  if (resend) {
    try {
      const domains = await resend.domains.list();
      if (domains.error) {
        console.error("❌ Resend API verification error:", domains.error.message);
        return false;
      }
      console.log("✉️ Mailer ready: Resend API authenticated successfully over HTTPS (Port 443)");
      return true;
    } catch (error) {
      console.error("❌ Resend verification failed:", error.message);
      return false;
    }
  }

  try {
    const mailer = getTransporter();
    await mailer.verify();
    console.log("✉️ Mailer ready: SMTP connection verified successfully on port 2525");
    return true;
  } catch (error) {
    console.error("❌ Mailer configuration / connectivity failed:", error.message);
    return false;
  }
}

/* ─────────────────────────────────────────────
   Sender Address Helper
───────────────────────────────────────────── */

function getFromAddress() {
  const configured = (process.env.EMAIL_FROM || "").trim();

  // If using Resend, unverified domains (like gmail.com) will fail Resend's policy.
  // Use onboarding@resend.dev until a verified custom domain is configured in Resend.
  if (process.env.RESEND_API_KEY) {
    if (!configured || configured.includes("@gmail.com") || configured.includes("@yahoo.com")) {
      return "RentKaroo <onboarding@resend.dev>";
    }
    return configured;
  }

  if (configured) return configured;
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  return `"RentKaroo" <${user || "noreply@rentkaroo.com"}>`;
}

/* ─────────────────────────────────────────────
   Email Templates
───────────────────────────────────────────── */

function baseTemplate(title, bodyHtml) {
  const appName = process.env.APP_NAME || "RentKaroo";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f4f4f5;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#ffffff;border-radius:14px;
                    box-shadow:0 4px 16px rgba(0,0,0,0.06);overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg, #0f9660 0%, #1DB47F 100%);padding:28px 36px;">
            <div style="display:flex;align-items:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.5px;font-family:Georgia,serif;">
                ${appName}
              </span>
            </div>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
              Your Trusted Rental Marketplace
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;color:#1f2937;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              If you did not request this email, no action is needed and your account remains safe.<br/>
              © ${new Date().getFullYear()} ${appName}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export function passwordResetTemplate({ name, resetUrl, expiresInMinutes = 15 }) {
  const greeting = name ? `Hi ${name},` : "Hello,";
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;font-family:Georgia,serif;">
      Reset your password
    </h2>
    <p style="margin:0 0 18px;font-size:15px;color:#4b5563;line-height:1.6;">
      ${greeting} we received a request to reset the password for your RentKaroo account. Click the button below to set a new password.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         target="_blank"
         rel="noopener noreferrer"
         style="display:inline-block;background:#1DB47F;color:#ffffff;text-decoration:none;
                font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;
                box-shadow:0 2px 6px rgba(29,180,127,0.35);letter-spacing:0.3px;">
        Reset Password →
      </a>
    </div>

    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin:24px 0;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
        ⏳ <strong>Security Note:</strong> This reset link expires in <strong>${expiresInMinutes} minutes</strong> and can only be used once.
      </p>
    </div>

    <p style="margin:24px 0 8px;font-size:13px;color:#6b7280;line-height:1.5;">
      If the button above doesn't work, copy and paste this link into your web browser:
    </p>
    <p style="margin:0;font-size:12px;word-break:break-all;color:#1DB47F;background:#f0fdf4;padding:10px 14px;border-radius:6px;border:1px solid #bbf7d0;">
      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="color:#0f9660;text-decoration:underline;">
        ${resetUrl}
      </a>
    </p>
  `;
  return baseTemplate("Reset your RentKaroo password", body);
}

export function otpVerifyTemplate({ name, otp, expiresInMinutes = 10 }) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Verify your email</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name || "there"}, use the code below to verify your account.
      It expires in <strong>${expiresInMinutes} minutes</strong>.
    </p>
    <div style="text-align:center;margin:0 0 28px;">
      <span style="display:inline-block;background:#f3f4f6;border-radius:10px;
                   padding:18px 48px;font-size:36px;font-weight:700;
                   letter-spacing:10px;color:#1DB47F;font-family:monospace;">
        ${otp}
      </span>
    </div>
    <p style="margin:0 0 10px;font-size:13px;color:#9ca3af;">
      Never share this code with anyone.
    </p>
    <p style="margin:20px 0 0 0;font-size:13px;color:#DC2626;font-weight:600;background:#FEE2E2;padding:8px 12px;border-radius:6px;display:inline-block;">
      ⚠️ Note: This verification code is only valid for ${expiresInMinutes} minutes.
    </p>`;
  return baseTemplate("Verify your email", body);
}

export function otpResetTemplate({ name, otp, expiresInMinutes = 10 }) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name || "there"}, we received a request to reset your password.
      Use the code below — it expires in <strong>${expiresInMinutes} minutes</strong>.
    </p>
    <div style="text-align:center;margin:0 0 28px;">
      <span style="display:inline-block;background:#fef3c7;border-radius:10px;
                   padding:18px 48px;font-size:36px;font-weight:700;
                   letter-spacing:10px;color:#d97706;font-family:monospace;">
        ${otp}
      </span>
    </div>
    <p style="margin:0 0 10px;font-size:13px;color:#9ca3af;">
      If you didn't request a password reset, please secure your account immediately.
    </p>
    <p style="margin:20px 0 0 0;font-size:13px;color:#DC2626;font-weight:600;background:#FEE2E2;padding:8px 12px;border-radius:6px;display:inline-block;">
      ⚠️ Note: This reset code is only valid for ${expiresInMinutes} minutes.
    </p>`;
  return baseTemplate("Reset your password", body);
}

/* ─────────────────────────────────────────────
   Unified Email Dispatcher (Resend API -> Nodemailer)
───────────────────────────────────────────── */

async function dispatchEmail({ to, subject, html }) {
  const resend = getResendClient();
  const from = getFromAddress();

  if (resend) {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend API delivery error:", error.message);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    console.log(`✉️ Email successfully delivered via Resend API to ${to} (ID: ${data?.id})`);
    return data;
  }

  // Fallback to Nodemailer SMTP
  const mailer = getTransporter();
  const result = await mailer.sendMail({
    from,
    to,
    subject,
    html,
  });
  console.log(`✉️ Email delivered via SMTP to ${to} (ID: ${result?.messageId})`);
  return result;
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes = 15 }) {
  return dispatchEmail({
    to,
    subject: "Reset your RentKaroo password",
    html: passwordResetTemplate({ name, resetUrl, expiresInMinutes }),
  });
}

export async function sendOtpVerifyEmail({ to, name, otp, expiresInMinutes = 10 }) {
  return dispatchEmail({
    to,
    subject: `${otp} is your verification code`,
    html: otpVerifyTemplate({ name, otp, expiresInMinutes }),
  });
}

export async function sendOtpResetEmail({ to, name, otp, expiresInMinutes = 10 }) {
  return dispatchEmail({
    to,
    subject: `${otp} is your password reset code`,
    html: otpResetTemplate({ name, otp, expiresInMinutes }),
  });
}