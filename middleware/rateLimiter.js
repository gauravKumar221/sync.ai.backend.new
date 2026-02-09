// middleware/rateLimiter.js
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

// OTP rate limiter - use environment variables
export const otpRateLimiter = rateLimit({
    windowMs: (process.env.OTP_WINDOW_MINUTES || 15) * 60 * 1000, // 15 minutes default
    max: process.env.OTP_MAX_ATTEMPTS || 3, // 3 attempts default
    message: {
        success: false,
        message: `Too many OTP requests. Please try again after ${process.env.OTP_WINDOW_MINUTES || 15} minutes.`
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable old headers
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: (req) => {
        // Use IP + email for OTP rate limiting with ipKeyGenerator for IPv6 support
        const ip = ipKeyGenerator(req, req.ip);
        return `${ip}:${req.body?.email || 'unknown'}`;
    }
});

// Login rate limiter
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req) => {
        // Use IP for login rate limiting
        return ipKeyGenerator(req, req.ip);
    }
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use IP for general API rate limiting
        return ipKeyGenerator(req, req.ip);
    }
});