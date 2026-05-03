const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema(
    {
        templateName: {
            type: String,
            required: true,
            index: true
        },
        channel: {
            type: String,
            required: true,
            enum: ['email', 'sms']
        },
        recipient: {
            type: String,
            required: true,
            index: true
        },
        recipientUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        subject: {
            type: String
        },
        status: {
            type: String,
            required: true,
            enum: ['PENDING', 'SENT', 'FAILED'],
            default: 'PENDING',
            index: true
        },
        providerResponse: {
            type: Object,
            default: {}
        },
        errorMessage: {
            type: String
        },
        attempts: {
            type: Number,
            default: 0
        },
        scheduledAt: {
            type: Date
        },
        sentAt: {
            type: Date
        },
        metadata: {
            type: Object,
            default: {}
            // Store context like appointmentId, userId, etc.
        },
        jobId: {
            type: String
        }
    },
    { timestamps: true }
);

// Indexes for efficient querying
NotificationLogSchema.index({ status: 1, createdAt: -1 });
NotificationLogSchema.index({ recipient: 1, createdAt: -1 });
NotificationLogSchema.index({ templateName: 1, createdAt: -1 });
NotificationLogSchema.index({ channel: 1, status: 1, createdAt: -1 });
NotificationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
