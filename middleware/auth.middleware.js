import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { APIError } from "./errorHandler.js";

/* ─────────────────────────────────────────────
   Token extraction
───────────────────────────────────────────── */

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
};

/* ─────────────────────────────────────────────
   Token blacklist store
   Same Redis-ready wrapper used in auth.service.js.
   Import your shared instance instead of redefining
   if you move this to a lib/tokenStore.js singleton.
───────────────────────────────────────────── */

const blacklist = {
  /** @type {Set<string>} */
  _store: new Set(),

  async has(jti) {
    // redis: return (await redis.exists(`bl:${jti}`)) === 1;
    return this._store.has(jti);
  },

  async add(jti, ttlSeconds) {
    // redis: await redis.set(`bl:${jti}`, "1", "EX", ttlSeconds);
    this._store.add(jti);
  },
};

// Export so auth.service.js logout can share the same store.
// In production, both modules import from lib/tokenStore.js instead.
export { blacklist };

/* ─────────────────────────────────────────────
   authenticate
   - Verifies the JWT signature and expiry
   - Checks the jti against the blacklist (covers logout)
   - Hydrates req.user from the DB so stale tokens
     (deleted user, changed role) are always caught
───────────────────────────────────────────── */

export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw new APIError("Authentication token required", 401);

    if (!process.env.JWT_SECRET) {
      throw new APIError("JWT secret not configured", 500);
    }

    // 1. Verify signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new APIError(
        err.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
        401
      );
    }

    // 2. Check blacklist (catches logged-out tokens still within TTL)
    if (decoded.jti && (await blacklist.has(decoded.jti))) {
      throw new APIError("Token has been revoked", 401);
    }

    // 3. Hydrate from DB — catches deleted users and role changes
    //    Select only the fields middleware needs; no password, no bloat.
    const user = await User.findById(decoded.id).select(
      "name email role isActive isVerified"
    );

    if (!user) {
      throw new APIError("User no longer exists", 401);
    }

    if (!user.isActive) {
      throw new APIError("Account is deactivated", 403);
    }

    if (!user.isVerified) {
      throw new APIError("Email not verified", 403);
    }

    // Attach the live DB user — controllers get fresh data, not stale payload
    req.user  = user;
    // Keep the raw token available for logout (needs to blacklist jti)
    req.token = token;

    next();
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
   authorize  (...roles)
   Must be used after authenticate.
   Usage:  router.delete("/users/:id", authenticate, authorize("admin"))
───────────────────────────────────────────── */

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new APIError("User not authenticated", 401));
    }

    const userRole    = req.user.role?.toLowerCase();
    const allowedRoles = roles.map((r) => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      // Log at debug level only — never expose role details in production stdout
      if (process.env.NODE_ENV !== "production") {
        console.debug(
          `[authorize] DENIED — userId=${req.user._id} role=${userRole} required=${allowedRoles.join(",")}`
        );
      }
      return next(
        new APIError(`Access denied. Required role: ${roles.join(" or ")}`, 403)
      );
    }

    next();
  };
};

/* ─────────────────────────────────────────────
   optionalAuth
   Attaches req.user if a valid token is present.
   Never blocks the request — used for public routes
   that behave differently for logged-in users
   (e.g. "save listing" button visibility).
───────────────────────────────────────────── */

export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token || !process.env.JWT_SECRET) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Invalid / expired token on an optional route — just skip silently
      return next();
    }

    if (decoded.jti && (await blacklist.has(decoded.jti))) {
      return next(); // Revoked — treat as unauthenticated
    }

    const user = await User.findById(decoded.id).select(
      "name email role isActive isVerified"
    );

    if (user?.isActive && user?.isVerified) {
      req.user  = user;
      req.token = token;
    }
  } catch {
    // Swallow all errors — optional auth must never break a public route
  }

  next();
};