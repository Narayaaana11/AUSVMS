const mongoose = require('mongoose');

const IntegrationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['api', 'webhook', 'external'],
            required: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        apiKey: String,
        apiSecret: String,
        webhookUrl: String,
        webhookEvents: [String],
        metadata: mongoose.Schema.Types.Mixed,
        connectionStatus: {
            type: String,
            enum: ['connected', 'disconnected', 'error'],
            default: 'disconnected',
        },
        lastSyncedAt: Date,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Integration', IntegrationSchema);
