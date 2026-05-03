const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Rate limiter for OTP resend - Max 3 resends per 1 hour per appointment
 * Uses memory store (simple, no external dependencies)
 */
const otpResendLimiter = rateLimit({
    keyGenerator: (req) => {
        // Key = appointmentId to limit per appointment
        return `otp-resend:${req.params.id || 'unknown'}`;
    },
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many OTP resend requests for this appointment. Please try again after 1 hour.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        // Skip rate limiting for admin users
        return req.user && req.user.role === 'admin';
    },
    handler: (req, res) => {
        console.warn('[rate-limit] OTP resend limit exceeded for appointment:', {
            appointmentId: req.params.id,
            userId: req.user?._id,
            userRole: req.user?.role,
            ip: req.ip,
        });
        res.status(429).json({
            success: false,
            message: 'Too many OTP resend requests. Maximum 3 requests per hour allowed. Please try again later.',
            retryAfter: res.getHeader('Retry-After'),
        });
    },
});

/**
 * Rate limiter for notification sending - Max 5 notifications per 1 hour per staff
 */
const notificationSendLimiter = rateLimit({
    keyGenerator: (req) => {
        // Key = userId to limit per staff member
        return `notification-send:${req.user?._id?.toString() || 'unknown'}`;
    },
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 notifications per hour
    message: 'Too many notification requests. Please try again after 1 hour.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for admin users
        return req.user && req.user.role === 'admin';
    },
    handler: (req, res) => {
        console.warn('[rate-limit] Notification send limit exceeded for user:', {
            userId: req.user?._id,
            userRole: req.user?.role,
            ip: req.ip,
        });
        res.status(429).json({
            success: false,
            message: 'Too many notification requests. Maximum 5 per hour allowed. Please try again later.',
            retryAfter: res.getHeader('Retry-After'),
        });
    },
});

/**
 * Rate limiter for appointment creation - Max 10 per hour per user
 */
const appointmentCreateLimiter = rateLimit({
    keyGenerator: (req) => {
        // Use ipKeyGenerator for IP-based limiting or user ID if authenticated
        if (req.user?._id) {
            return `appointment-create:user:${req.user._id.toString()}`;
        }
        return `appointment-create:ip:${ipKeyGenerator(req)}`;
    },
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 appointments per hour
    message: 'Too many appointments created. Please try again after 1 hour.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.user && (req.user.role === 'admin' || req.user.role === 'staff');
    },
    handler: (req, res) => {
        console.warn('[rate-limit] Appointment creation limit exceeded for user:', {
            userId: req.user?._id,
            ip: req.ip,
        });
        res.status(429).json({
            success: false,
            message: 'Too many appointment requests. Please try again after 1 hour.',
            retryAfter: res.getHeader('Retry-After'),
        });
    },
});

module.exports = {
    otpResendLimiter,
    notificationSendLimiter,
    appointmentCreateLimiter,
};
