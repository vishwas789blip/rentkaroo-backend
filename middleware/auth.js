import jwt from 'jsonwebtoken';
import { APIError } from './errorHandler.js';

// 🔐 Extract Token Safely
const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  if (!authHeader.startsWith('Bearer ')) return null;

  return authHeader.split(' ')[1];
};

// ================= AUTHENTICATE =================

export const authenticate = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new APIError('Authentication token required', 401);
  }

  if (!process.env.JWT_SECRET) {
    throw new APIError('JWT secret not configured', 500);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { id, role, email, etc }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new APIError('Token expired', 401);
    }

    throw new APIError('Invalid token', 401);
  }
};

// ================= AUTHORIZE =================

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new APIError('User not authenticated', 401);
    }

    console.log(`Access Denied. Token Role: ${req.user.role} | Required Roles: ${roles}`);

    if (!roles.includes(req.user.role)) {
      throw new APIError(`Forbidden: Requires ${roles} role`, 403);
    }

    next();
  };
};

// ================= OPTIONAL AUTH =================

export const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token || !process.env.JWT_SECRET) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // Silently ignore invalid token
  }

  next();
};