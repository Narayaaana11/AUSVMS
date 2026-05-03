const mongoose = require('mongoose');

const NotificationTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        channels: {
            email: { type: Boolean, default: false },
            sms: { type: Boolean, default: false },
            inApp: { type: Boolean, default: false },
        },
        emailTemplate: {
            subject: String,
            body: String,
        },
        smsTemplate: {
            content: String,
        },
        inAppTemplate: {
            title: String,
            message: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('NotificationTemplate', NotificationTemplateSchema);
