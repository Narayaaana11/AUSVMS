const bcrypt = require('bcrypt');
const Visitor = require('../models/Visitor');
const OtpAttemptLog = require('../models/OtpAttemptLog');
const createError = require('http-errors');
const dayjs = require('dayjs');
const logger = require('../utils/logger');
const OTP = require('../models/OTP');
const { hashOTP } = require('../utils/otp');

const MAX_OTP_SCAN = 300; // Limit brute-force scans for legacy bcrypt hashes

// Helper: Find visitor by OTP supporting both new SHA256 hash and legacy bcrypt hashes
const findVisitorByOtp = async (otp) => {
    const hashedOtp = hashOTP(otp);

    const visitorByHash = await Visitor.findOne({ otpHash: hashedOtp });
    if (visitorByHash) {
        return { visitor: visitorByHash, hashedOtp };
    }

    // Legacy fallback: scan limited recent OTP records and compare with bcrypt hashes
    const candidates = await OTP.find({ used: false }).sort({ createdAt: -1 }).limit(MAX_OTP_SCAN);
    for (const record of candidates) {
        const ok = await bcrypt.compare(String(otp), record.codeHash);
        if (!ok) continue;

        const visitor = await Visitor.findById(record.appointmentId);
        if (!visitor) continue;

        // Self-heal by persisting deterministic hash for future direct lookups
        if (visitor.otpHash !== hashedOtp) {
            visitor.otpHash = hashedOtp;
            if (!visitor.otpExpiresAt && record.expiresAt) {
                visitor.otpExpiresAt = record.expiresAt;
            }
            await visitor.save();
        }

        return { visitor, hashedOtp, otpRecord: record };
    }

    return null;
};

// Helper: Log OTP Attempt
const logAttempt = async ({ appointmentId, action, result, guardId, ip, failureReason }) => {
    try {
        await OtpAttemptLog.create({
            appointmentId,
            action,
            result,
            guardId,
            ip,
            failureReason
        });
    } catch (err) {
        logger.error('Failed to log OTP attempt', { error: err.message, appointmentId, action });
    }
};

exports.verifyEntry = async (req, res, next) => {
    try {
        const { otp } = req.body;
        if (!otp) return next(createError(400, 'OTP is required'));

        const match = await findVisitorByOtp(otp);
        const visitor = match?.visitor;

        // Logging context
        const ip = req.ip || req.connection.remoteAddress;
        const guardId = req.user._id;

        if (!visitor) {
            // We can't log appointmentId if we didn't find one... 
            // But maybe we can try to find by other means? 
            // For now, if no visitor found with this OTP, we can't increment attempts on a specific record 
            // unless we found a record but the OTP was wrong (which is contradictory here since we searched by OTP).
            // Actually, searching by OTP hash implies if we find it, the OTP is "correct".
            // If we don't find it, the OTP is "wrong" or doesn't exist.
            // SECURITY NOTE: To properly handle "lockout" we usually need to find the user first.
            // But here the "key" IS the OTP. So if the OTP is wrong, we don't know *which* user they were trying to access.
            // Unless... the Guard portal flow is "Select Visitor -> Enter OTP"? 
            // The requirement says: "Guard enters OTP -> show success/fail toast." (Implies global search by OTP)
            // AND "1. POST /api/guard/verify-entry Body: { otp: '123456' }"

            // If we can't find the visitor by OTP, it's just "Invalid OTP".
            return next(createError(404, 'Invalid OTP or appointment not found'));
        }

        // Check Status - Allow pending, approved, expected, and rescheduled
        if (visitor.status !== 'pending' && visitor.status !== 'approved' && visitor.status !== 'expected' && visitor.status !== 'rescheduled') {
            await logAttempt({ appointmentId: visitor._id, action: 'VERIFY_ENTRY', result: 'FAILED', guardId, ip, failureReason: 'INVALID_STATUS' });
            return next(createError(400, `Visitor status is ${visitor.status}, cannot check-in`));
        }

        // Check Lockout
        if (visitor.otpAttempts >= visitor.maxOtpAttempts) {
            await logAttempt({ appointmentId: visitor._id, action: 'VERIFY_ENTRY', result: 'FAILED', guardId, ip, failureReason: 'LOCKED' });
            return next(createError(403, 'Maximum OTP attempts exceeded. Please contact admin.'));
        }

        // Check Expiry
        if (visitor.otpExpiresAt && dayjs().isAfter(dayjs(visitor.otpExpiresAt))) {
            await visitor.updateOne({ $inc: { otpAttempts: 1 } });
            await logAttempt({ appointmentId: visitor._id, action: 'VERIFY_ENTRY', result: 'FAILED', guardId, ip, failureReason: 'EXPIRED' });
            return next(createError(400, 'OTP has expired'));
        }

        // Success
        visitor.status = 'checked-in';
        visitor.checkInAt = new Date();
        visitor.otpAttempts = 0; // Reset attempts on success? Or keep history? Usually reset.
        await visitor.save();

        await logAttempt({ appointmentId: visitor._id, action: 'VERIFY_ENTRY', result: 'SUCCESS', guardId, ip });

        // Socket Emit
        if (global.io) {
            global.io.emit('visitor_checked_in', {
                id: visitor._id,
                visitorName: visitor.name,
                checkInAt: visitor.checkInAt,
                status: 'checked-in'
            });
        }

        res.json({ success: true, message: 'Check-in successful', visitor });

    } catch (err) {
        next(err);
    }
};

exports.verifyExit = async (req, res, next) => {
    try {
        const { otp } = req.body;
        if (!otp) return next(createError(400, 'OTP is required'));

        const match = await findVisitorByOtp(otp);
        const visitor = match?.visitor;

        const ip = req.ip || req.connection.remoteAddress;
        const guardId = req.user._id;

        if (!visitor) {
            return next(createError(404, 'Invalid OTP or visitor not found'));
        }

        // Check if ALREADY checked out
        if (visitor.status === 'checked-out' || visitor.status === 'completed') {
            await logAttempt({ appointmentId: visitor._id, action: 'VERIFY_EXIT', result: 'FAILED', guardId, ip, failureReason: 'ALREADY_EXITED' });
            return next(createError(400, 'Visitor already checked out'));
        }

        // Check if IN CAMPUS
        if (visitor.status !== 'checked-in') {
            await logAttempt({ appointmentId: visitor._id, action: 'VERIFY_EXIT', result: 'FAILED', guardId, ip, failureReason: 'INVALID_STATUS' });
            return next(createError(400, `Visitor status is ${visitor.status}, cannot check-out`));
        }

        // NOTE: Exit typically doesn't need to "Check Expiry" strictly if they are already inside? 
        // Requirement says: "OTP Expiry: Default 24 hours... Both operations use the same OTP."
        // Usually, exit allows expired OTPs if the person is stuck inside? 
        // "Exit allowed only if: Status = IN". It doesn't explicitly say "Check Expiry" for exit in the "Exit allowed only if" section?
        // Wait, prompt says: "Exit allowed only if: Status = IN". It does NOT list "OTP not expired" under Exit constraints.
        // However, "OTP is valid for: Entry verification, Exit verification".
        // I will enforce expiry to be safe, but practically, guards might need to override. 
        // For now, I will enforce it as per "OTP is valid for..."
        if (dayjs().isAfter(dayjs(visitor.otpExpiresAt))) {
            // If expired, maybe allow manual override? Or fail?
            // Prompt says: "OTP not expired" is listed under "Entry allowed only if", NOT "Exit allowed only if".
            // But "OTP is valid for: Entry... Exit".
            // I'll be lenient on Exit for Expiry, as getting stuck inside is bad. 
            // BUT strict on matching the hash.
        }

        // Success
        visitor.status = 'checked-out';
        visitor.checkOutAt = new Date();
        await visitor.save();

        await logAttempt({ appointmentId: visitor._id, action: 'VERIFY_EXIT', result: 'SUCCESS', guardId, ip });

        if (global.io) {
            global.io.emit('visitor_checked_out', {
                id: visitor._id,
                visitorName: visitor.name,
                checkOutAt: visitor.checkOutAt,
                status: 'checked-out'
            });
        }

        res.json({ success: true, message: 'Check-out successful', visitor });

    } catch (err) {
        next(err);
    }
};

exports.searchVisitor = async (req, res, next) => {
    try {
        const { q } = req.query; // Query: OTP, Name, or Phone
        if (!q) return res.json([]);

        // Check if query looks like an OTP (6 digits)
        const isOtp = /^\d{6}$/.test(q);

        let query = {};
        if (isOtp) {
            query = { otpHash: hashOTP(q) };
        } else {
            query = {
                $or: [
                    { name: new RegExp(q, 'i') },
                    { contactNumber: new RegExp(q, 'i') },
                    { visitorPassId: q }
                ]
            };
        }

        const visitors = await Visitor.find(query).select('name contactNumber purposeOfVisit personToMeet department status checkInAt checkOutAt photoUrl visitorPassId otpExpiresAt');

        res.json(visitors);

    } catch (err) {
        next(err);
    }
};
