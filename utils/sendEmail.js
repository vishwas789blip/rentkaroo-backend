import { Resend } from "resend";

export const sendEmail = async (to, subject, html) => {
  // Initialize inside the function to ensure process.env is ready
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (!process.env.RESEND_API_KEY) {
    console.error("Email failed: RESEND_API_KEY is missing in .env");
    return;
  }

  try {
    await resend.emails.send({
      from: "RentKaroo <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};