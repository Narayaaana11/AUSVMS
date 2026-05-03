const createError = require('http-errors');
const NotificationTemplate = require('../models/NotificationTemplate');

// Get all templates
exports.getAllTemplates = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 25 } = req.query;
        const numericPage = Math.max(parseInt(page, 10) || 1, 1);
        const numericPageSize = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 200);

        const [items, total] = await Promise.all([
            NotificationTemplate.find({})
                .sort({ createdAt: -1 })
                .skip((numericPage - 1) * numericPageSize)
                .limit(numericPageSize),
            NotificationTemplate.countDocuments({}),
        ]);

        res.json({ items, total, page: numericPage, pageSize: numericPageSize });
    } catch (err) {
        next(err);
    }
};

// Get single template
exports.getTemplateById = async (req, res, next) => {
    try {
        const template = await NotificationTemplate.findById(req.params.id);
        if (!template) return next(createError(404, 'Template not found'));
        res.json(template);
    } catch (err) {
        next(err);
    }
};

// Create template
exports.createTemplate = async (req, res, next) => {
    try {
        const { name, channels, emailTemplate, smsTemplate, inAppTemplate } = req.body;

        if (!name) {
            return next(createError(400, 'Template name is required'));
        }

        const template = new NotificationTemplate({
            name,
            channels: channels || {},
            emailTemplate: emailTemplate || {},
            smsTemplate: smsTemplate || {},
            inAppTemplate: inAppTemplate || {},
        });

        const saved = await template.save();
        res.status(201).json(saved);
    } catch (err) {
        if (err.code === 11000) {
            return next(createError(400, 'Template name already exists'));
        }
        next(err);
    }
};

// Update template
exports.updateTemplate = async (req, res, next) => {
    try {
        const { name, channels, emailTemplate, smsTemplate, inAppTemplate, isActive } = req.body;

        const template = await NotificationTemplate.findByIdAndUpdate(
            req.params.id,
            {
                ...(name && { name }),
                ...(channels && { channels }),
                ...(emailTemplate && { emailTemplate }),
                ...(smsTemplate && { smsTemplate }),
                ...(inAppTemplate && { inAppTemplate }),
                ...(isActive !== undefined && { isActive }),
            },
            { new: true, runValidators: true }
        );

        if (!template) return next(createError(404, 'Template not found'));
        res.json(template);
    } catch (err) {
        next(err);
    }
};

// Delete template
exports.deleteTemplate = async (req, res, next) => {
    try {
        const template = await NotificationTemplate.findByIdAndDelete(req.params.id);
        if (!template) return next(createError(404, 'Template not found'));
        res.json({ message: 'Template deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// ================= USER NOTIFICATIONS =================

const Notification = require('../models/Notification');

// Get my notifications
exports.getMyNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50

        // Map to expected format: { id, message, read, timestamp }
        const mapped = notifications.map(n => ({
            id: n._id,
            message: n.message,
            read: n.read,
            timestamp: n.createdAt
        }));

        res.json(mapped);
    } catch (err) {
        next(err);
    }
};

// Mark as read
exports.markRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { read: true },
            { new: true }
        );
        if (!notification) return next(createError(404, 'Notification not found'));
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

// Mark all as read
exports.markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { read: true }
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};
