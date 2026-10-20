// config/validateEnv.js
const REQUIRED_ENV_VARS = [
  "MONGODB_URI", "JWT_SECRET", "JWT_REFRESH_SECRET",
  "REDIS_URL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

export const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  const hasEmail =
    Boolean(process.env.RESEND_API_KEY) ||
    Boolean(process.env.SMTP_USER && process.env.SMTP_PASS) ||
    Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

  if (!hasEmail) {
    missing.push("RESEND_API_KEY (or SMTP_USER/PASS or EMAIL_USER/PASS)");
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("✅ All required env vars present");
};