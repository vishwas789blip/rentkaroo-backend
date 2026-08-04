import crypto from "crypto";
import redis from "../config/redis.js";

const otpStore = {
  async set(key, value, ttlSeconds) {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  },

  async get(key) {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  },

  async delete(key) {
    await redis.del(key);
  },

  async increment(key, field) {
    const raw = await redis.get(key);
    if (!raw) return;
    const entry = JSON.parse(raw);
    entry[field] = (entry[field] || 0) + 1;
    // TTL preserve karne ke liye remaining TTL nikaalo aur reset karo
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(entry), "EX", ttl > 0 ? ttl : OTP_TTL_SECONDS);
  },
};


/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */

const OTP_LENGTH        = 6;                                          // digits
const OTP_TTL_SECONDS   = parseInt(process.env.OTP_TTL_SECONDS  || "600"); // 10 min
const OTP_MAX_ATTEMPTS  = parseInt(process.env.OTP_MAX_ATTEMPTS || "5");
const OTP_RESEND_WINDOW = parseInt(process.env.OTP_RESEND_WINDOW || "60"); // 1 min

export const OTP_EXPIRES_MINUTES = OTP_TTL_SECONDS / 60;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

/** Generate a cryptographically random N-digit OTP string */
function generateOtp(length = OTP_LENGTH) {
  const max = Math.pow(10, length);
  // Use crypto.randomInt for unbiased, secure random integers
  return crypto.randomInt(0, max).toString().padStart(length, "0");
}

/** Hash the OTP before storing — we never store plaintext */
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function storeKey(purpose, email) {
  return `otp:${purpose}:${email.toLowerCase()}`;
}

/* ─────────────────────────────────────────────
   OtpService
───────────────────────────────────────────── */

export class OtpService {
  /**
   * Generate a new OTP for a given purpose and email.
   * Enforces a resend cooldown to prevent spam.
   *
   * @param {"verify"|"reset"} purpose
   * @param {string} email
   * @returns {string} plaintext OTP (send this in the email, never store it)
   */
  static async generate(purpose, email) {
    const key = storeKey(purpose, email);
    const existing = await otpStore.get(key);

    if (existing) {
      const age = (Date.now() - existing.createdAt) / 1000;
      if (age < OTP_RESEND_WINDOW) {
        const waitSeconds = Math.ceil(OTP_RESEND_WINDOW - age);
        throw Object.assign(
          new Error(`Please wait ${waitSeconds}s before requesting a new code.`),
          { status: 429 }
        );
      }
    }

    const otp = generateOtp();

    await otpStore.set(
      key,
      {
        hash:       hashOtp(otp),
        attempts:   0,
        createdAt:  Date.now(),
      },
      OTP_TTL_SECONDS
    );

    return otp;
  }

  /**
   * Verify an OTP. Consumes it on success (one-time use).
   * Tracks failed attempts and throws after OTP_MAX_ATTEMPTS.
   *
   * @param {"verify"|"reset"} purpose
   * @param {string} email
   * @param {string} otp  Plaintext code from the user
   * @returns {true}
   * @throws on invalid / expired / exceeded attempts
   */
  static async verify(purpose, email, otp) {
    const key = storeKey(purpose, email);
    const record = await otpStore.get(key);

    if (!record) {
      throw Object.assign(
        new Error("OTP expired or not found. Please request a new code."),
        { status: 400 }
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await otpStore.delete(key);
      throw Object.assign(
        new Error("Too many incorrect attempts. Please request a new code."),
        { status: 429 }
      );
    }

    const inputHash = hashOtp(String(otp).trim());
    const isValid   = crypto.timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(record.hash)
    );

    if (!isValid) {
      await otpStore.increment(key, "attempts");
      const remaining = OTP_MAX_ATTEMPTS - (record.attempts + 1);
      throw Object.assign(
        new Error(`Incorrect code. ${remaining} attempt(s) remaining.`),
        { status: 400 }
      );
    }

    // Valid — delete immediately (one-time use)
    await otpStore.delete(key);
    return true;
  }

  /**
   * Check whether an unexpired OTP exists for this purpose + email.
   * Useful for showing "resend available in Xs" on the frontend.
   */
  static async getResendWait(purpose, email) {
    const key = storeKey(purpose, email);
    const existing = await otpStore.get(key);
    if (!existing) return 0;
    const age = (Date.now() - existing.createdAt) / 1000;
    return Math.max(0, Math.ceil(OTP_RESEND_WINDOW - age));
  }
}