import nodemailer from "nodemailer";

/**
 * Singleton Transporter Instance
 */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials missing in .env");
  }

  transporter = nodemailer.createTransport({
    "service" : "gmail",
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_PASS.trim(),
    },
    tls:{
      rejectUnauthorized: false
    }
  });

  return transporter;
}

// Global server startup ke waqt check karne ke liye (server.js mein call kar sakte ho)
export async function verifyMailer() {
  try {
    const mailer = getTransporter();
    await mailer.verify();
    console.log("✉️ Mailer ready and pool configured");
  } catch (error) {
    console.error("❌ Mailer configuration failed:", error.message);
  }
}

/* ─────────────────────────────────────────────
   Email templates
───────────────────────────────────────────── */

function baseTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;
                    box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;">
        <tr>
          <td style="background:#4F46E5;padding:28px 40px;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;
                      letter-spacing:.5px;">
              ${process.env.APP_NAME || "RentKaroo"}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              If you did not request this, you can safely ignore this email.<br/>
              © ${new Date().getFullYear()} ${process.env.APP_NAME || "RentKaroo"}.
              All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/** OTP email — registration / email verification */
export function otpVerifyTemplate({ name, otp, expiresInMinutes = 10 }) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Verify your email</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name}, use the code below to verify your account.
      It expires in <strong>${expiresInMinutes} minutes</strong>.
    </p>
    <div style="text-align:center;margin:0 0 28px;">
      <span style="display:inline-block;background:#f3f4f6;border-radius:10px;
                   padding:18px 48px;font-size:36px;font-weight:700;
                   letter-spacing:10px;color:#4F46E5;font-family:monospace;">
        ${otp}
      </span>
    </div>
    <p style="margin:0 0 10px;font-size:13px;color:#9ca3af;">
      Never share this code with anyone.
    </p>
    <p style="margin:20px 0 0 0;font-size:13px;color:#DC2626;font-weight:600;background:#FEE2E2;padding:8px 12px;border-radius:6px;display:inline-block;">
      ⚠️ Note: This email and verification code are only valid for the next ${expiresInMinutes} minutes.
    </p>`;
  return baseTemplate("Verify your email", body);
}

/** OTP email — forgot password / reset */
export function otpResetTemplate({ name, otp, expiresInMinutes = 10 }) {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Reset your password</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name}, we received a request to reset your password.
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
      ⚠️ Note: This email and reset code are only valid for the next ${expiresInMinutes} minutes.
    </p>`;
  return baseTemplate("Reset your password", body);
}

/* ─────────────────────────────────────────────
   Send helpers (Using the shared Connection Pool)
───────────────────────────────────────────── */

export async function sendOtpVerifyEmail({ to, name, otp, expiresInMinutes }) {
  const mailer = getTransporter(); // Singleton instance re-used smoothly

  await mailer.sendMail({
    from: `"RentKaroo" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} is your verification code`,
    html: otpVerifyTemplate({ name, otp, expiresInMinutes }),
  });
}

export async function sendOtpResetEmail({ to, name, otp, expiresInMinutes }) {
  const mailer = getTransporter(); 

  await mailer.sendMail({
    from: `"RentKaroo" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} is your password reset code`,
    html: otpResetTemplate({ name, otp, expiresInMinutes }),
  });
}