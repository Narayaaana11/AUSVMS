const mongoose = require('mongoose');

const AppointmentLogSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Visitor',
            required: true,
            index: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                'CREATED',
                'APPROVED',
                'REJECTED',
                'RESCHEDULED',
                'CANCELLED',
                'BULK_APPROVED',
                'BULK_REJECTED',
                'UPDATED',
                'CHECKED_IN',
                'CHECKED_OUT',
                'OTP_REGENERATED'
            ]
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        performedByRole: {
            type: String,
            enum: ['admin', 'staff', 'guard', 'security', 'system'],
            required: true
        },
        oldValues: {
            type: Object,
            default: {}
        },
        newValues: {
            type: Object,
            default: {}
        },
        reason: {
            type: String,
            trim: true
        },
        metadata: {
            type: Object,
            default: {}
        },
        ipAddress: {
            type: String
        }
    },
    { timestamps: true }
);

// Indexes for efficient querying
AppointmentLogSchema.index({ appointmentId: 1, createdAt: -1 });
AppointmentLogSchema.index({ performedBy: 1, createdAt: -1 });
AppointmentLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AppointmentLog', AppointmentLogSchema);
