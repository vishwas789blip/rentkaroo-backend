import { Resend } from "resend";

export const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not loaded from .env");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "RentKaroo <onboarding@resend.dev>",
    to,
    subject,
    html,
  });

  console.log("Email sent successfully to:", to);
};