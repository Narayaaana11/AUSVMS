const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true }, // e.g., 'email_smtp', 'sms_provider' (unique creates index)
        value: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON object or string
        description: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
