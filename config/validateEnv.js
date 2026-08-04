// config/validateEnv.js — naya file
const REQUIRED_ENV_VARS = [
  "MONGODB_URI", "JWT_SECRET", "JWT_REFRESH_SECRET",
  "REDIS_URL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET", "EMAIL_USER", "EMAIL_PASS",
];

export const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("✅ All required env vars present");
};