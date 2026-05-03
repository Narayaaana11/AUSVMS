const mongoose = require('mongoose');

const ScheduledReportSchema = new mongoose.Schema(
    {
        reportType: {
            type: String,
            enum: ['VISITOR', 'APPOINTMENT', 'USER_ACTIVITY'],
            required: true,
        },
        schedule: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            required: true,
        },
        time: { type: String, default: '09:00' }, // HH:MM format
        emails: [{ type: String }],
        isActive: { type: Boolean, default: true },
        lastRun: { type: Date },
        nextRun: { type: Date },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ScheduledReport', ScheduledReportSchema);
