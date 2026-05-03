const mongoose = require('mongoose');

const OtpAttemptLogSchema = new mongoose.Schema(
    {
        appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true },
        action: {
            type: String,
            enum: ['VERIFY_ENTRY', 'VERIFY_EXIT'],
            required: true
        },
        result: {
            type: String,
            enum: ['SUCCESS', 'FAILED'],
            required: true
        },
        guardId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ip: { type: String },
        attemptedAt: { type: Date, default: Date.now },
        failureReason: {
            type: String,
            enum: ['WRONG_OTP', 'EXPIRED', 'LOCKED', 'ALREADY_EXITED', 'INVALID_STATUS', 'SYSTEM_ERROR', 'ALREADY_CHECKED_IN']
        }
    },
    { timestamps: true } // Adds createdAt, updatedAt automatically
);

// Index for security monitoring
OtpAttemptLogSchema.index({ appointmentId: 1, attemptedAt: -1 });
OtpAttemptLogSchema.index({ ip: 1, attemptedAt: -1 });

module.exports = mongoose.model('OtpAttemptLog', OtpAttemptLogSchema);
