const mongoose = require('mongoose');

const EmailConfigSchema = new mongoose.Schema(
    {
        smtpHost: { type: String, required: true },
        smtpPort: { type: Number, required: true },
        senderEmail: { type: String, required: true },
        senderName: { type: String, required: true },
        authenticationEmail: { type: String, required: true },
        authenticationPassword: { type: String, required: true }, // Encrypted
    },
    { timestamps: true }
);

module.exports = mongoose.model('EmailConfig', EmailConfigSchema);
