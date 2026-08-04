import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

const makeStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: `rl:${prefix}:`,
});

// General API limiter
export const generalLimiter = rateLimit({
  store: makeStore('general'),
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  }
});

// Auth limiter (Login/Register protection)
export const authLimiter = rateLimit({
  store: makeStore('auth'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  }
});

// Booking limiter (prevent spam bookings)
export const bookingLimiter = rateLimit({
  store: makeStore('booking'),
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many booking attempts, please try again later'
  }
});

// Review limiter (prevent spam reviews)
export const reviewLimiter = rateLimit({
  store: makeStore('review'),
  windowMs: 10 * 60 * 1000, 
  max: 10, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many review actions from this IP, please try again later'
  }
});