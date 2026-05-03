const notificationService = require('../services/notificationService');
const templateService = require('../services/templateService');
const smtpService = require('../services/smtpService');
const createError = require('http-errors');

/**
 * Email/SMS System Controller
 * Handles SMTP/SMS config, template management, and notification sending
 */

// ============= CONFIGURATION =============

exports.getConfig = async (req, res, next) => {
    try {
        const smtp = await notificationService.getConfig('SMTP');
        const sms = await notificationService.getConfig('SMS');

        res.json({
            success: true,
            data: { smtp: smtp || null, sms: sms || null }
        });
    } catch (error) {
        next(error);
    }
};

exports.saveConfig = async (req, res, next) => {
    try {
        const { type, provider, settings } = req.body;

        if (!type || !provider || !settings) {
            return next(createError(400, 'type, provider, and settings are required'));
        }

        if (!['SMTP', 'SMS'].includes(type)) {
            return next(createError(400, 'type must be SMTP or SMS'));
        }

        const config = await notificationService.saveConfig(type, provider, settings);

        res.json({
            success: true,
            message: `${type} configuration saved successfully`,
            data: config
        });
    } catch (error) {
        next(error);
    }
};

exports.sendTestEmail = async (req, res, next) => {
    try {
        const { toEmail } = req.body;

        if (!toEmail) {
            return next(createError(400, 'toEmail is required'));
        }

        const result = await smtpService.sendTestEmail(toEmail);

        res.json({
            success: true,
            message: 'Test email sent successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.verifySmtp = async (req, res, next) => {
    try {
        const isValid = await smtpService.verifyConnection();

        res.json({
            success: true,
            verified: isValid,
            message: isValid ? 'SMTP connection verified' : 'SMTP connection failed'
        });
    } catch (error) {
        next(error);
    }
};

// ============= TEMPLATES =============

exports.getTemplates = async (req, res, next) => {
    try {
        const filters = {
            category: req.query.category,
            enabled: req.query.enabled !== undefined ? req.query.enabled === 'true' : undefined,
            channel: req.query.channel,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };

        const result = await templateService.getTemplates(filters);

        res.json({
            success: true,
            data: result.templates,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.createEmailTemplate = async (req, res, next) => {
    try {
        const templateData = req.body;
        const createdBy = req.user._id;

        const template = await templateService.createTemplate(templateData, createdBy);

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: template
        });
    } catch (error) {
        if (error.code === 11000) {
            return next(createError(409, 'Template with this name already exists'));
        }
        next(error);
    }
};

exports.updateEmailTemplate = async (req, res, next) => {
    try {
        const { name } = req.params;
        const updates = req.body;
        const updatedBy = req.user._id;

        const template = await templateService.updateTemplate(name, updates, updatedBy);

        res.json({
            success: true,
            message: 'Template updated successfully',
            data: template
        });
    } catch (error) {
        next(error);
    }
};

exports.toggleEmailTemplate = async (req, res, next) => {
    try {
        const { name } = req.params;
        const { enabled } = req.body;
        const updatedBy = req.user._id;

        const template = await templateService.updateTemplate(name, { enabled }, updatedBy);

        res.json({
            success: true,
            message: `Template ${enabled ? 'enabled' : 'disabled'} successfully`,
            data: template
        });
    } catch (error) {
        next(error);
    }
};

exports.previewEmailTemplate = async (req, res, next) => {
    try {
        const { name } = req.params;
        const sampleData = req.body.data || {};

        const rendered = await templateService.previewTemplate(name, sampleData);

        res.json({
            success: true,
            data: rendered
        });
    } catch (error) {
        next(error);
    }
};

// ============= SENDING =============

exports.sendNotification = async (req, res, next) => {
    try {
        const { channel, templateName, to, data, sendAt, metadata } = req.body;

        if (!channel || !templateName || !to || !data) {
            return next(createError(400, 'channel, templateName, to, and data are required'));
        }

        const result = await notificationService.sendNotification({
            channel,
            templateName,
            to,
            data,
            sendAt,
            metadata
        });

        res.json({
            success: true,
            message: 'Notification queued successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// ============= LOGS =============

exports.getLogs = async (req, res, next) => {
    try {
        const filters = {
            status: req.query.status,
            channel: req.query.channel,
            recipient: req.query.recipient,
            templateName: req.query.templateName,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const result = await notificationService.getLogs(filters);

        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.retryNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await notificationService.retryNotification(id);

        res.json({
            success: true,
            message: 'Notification queued for retry',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.bulkRetry = async (req, res, next) => {
    try {
        const { logIds } = req.body;

        if (!Array.isArray(logIds) || logIds.length === 0) {
            return next(createError(400, 'logIds array is required'));
        }

        const result = await notificationService.bulkRetry(logIds);

        res.json({
            success: true,
            message: `${result.retriedCount} notification(s) queued for retry`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const stats = await notificationService.getStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};
