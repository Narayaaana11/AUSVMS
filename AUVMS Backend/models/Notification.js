const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String, // e.g., 'appointment', 'system', 'alert'
            default: 'system',
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId, // e.g., Visitor ID, Appointment ID
            refPath: 'onModel',
        },
        onModel: {
            type: String,
            enum: ['Visitor', 'User', 'SystemConfig'],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
