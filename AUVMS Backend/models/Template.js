const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        bodyHtml: {
            type: String,
            required: true
        },
        bodyText: {
            type: String,
            required: true
        },
        bodySms: {
            type: String,
            maxlength: 160
        },
        enabled: {
            type: Boolean,
            default: true
        },
        channels: {
            type: [String],
            enum: ['email', 'sms'],
            default: ['email']
        },
        placeholders: {
            type: [String],
            default: []
        },
        category: {
            type: String,
            enum: ['appointment', 'user', 'system', 'security'],
            default: 'system'
        },
        description: {
            type: String
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: true }
);

// Indexes
// Note: name already has index from unique:true
TemplateSchema.index({ enabled: 1, category: 1 });
TemplateSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Template', TemplateSchema);
