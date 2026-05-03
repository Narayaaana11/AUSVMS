const mongoose = require('mongoose');

const NotificationConfigSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ['SMTP', 'SMS'],
            unique: true
        },
        provider: {
            type: String,
            required: true,
            enum: ['smtp', 'gmail', 'sendgrid', 'twilio', 'aws-sns']
        },
        settings: {
            type: Object,
            required: true,
            default: {}
            // SMTP: { host, port, secure, senderName, senderEmail, authEmail, encryptedPassword }
            // SMS: { accountSid, encryptedAuthToken, fromNumber }
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastTestedAt: {
            type: Date
        },
        testStatus: {
            type: String,
            enum: ['success', 'failed', 'not_tested'],
            default: 'not_tested'
        },
        testError: {
            type: String
        }
    },
    { timestamps: true }
);

// Index for quick lookup
NotificationConfigSchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model('NotificationConfig', NotificationConfigSchema);
