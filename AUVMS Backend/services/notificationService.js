const Queue = require('bull');
const NotificationConfig = require('../models/NotificationConfig');
const NotificationLog = require('../models/NotificationLog');
const Template = require('../models/Template');
const { encrypt, decrypt, maskValue } = require('../utils/encryption');
const templateService = require('./templateService');
const logger = require('../utils/logger');

// Create Bull queue instance
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const notificationQueue = new Queue('notification', REDIS_URL, {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000 // 2s, 4s, 8s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500 // Keep last 500 failed jobs
    }
});

// Event listeners for monitoring
notificationQueue.on('completed', (job, result) => {
    logger.info('Notification job completed', {
        jobId: job.id,
        logId: job.data.logId,
        result
    });
});

notificationQueue.on('failed', (job, err) => {
    logger.error('Notification job failed', {
        jobId: job.id,
        logId: job.data.logId,
        error: err.message,
        attempt: job.attemptsMade
    });
});

/**
 * Get notification configuration
 * @param {string} type - 'SMTP' | 'SMS'
 * @returns {Promise<Object>} - Config with masked sensitive values
 */
async function getConfig(type) {
    const config = await NotificationConfig.findOne({ type });

    if (!config) {
        return null;
    }

    // Return config with masked passwords
    const maskedSettings = { ...config.settings };

    if (maskedSettings.encryptedPassword) {
        maskedSettings.password = maskValue('', 0); // Shows ********
        delete maskedSettings.encryptedPassword;
    }

    if (maskedSettings.encryptedAuthToken) {
        maskedSettings.authToken = maskValue('', 0);
        delete maskedSettings.encryptedAuthToken;
    }

    return {
        type: config.type,
        provider: config.provider,
        settings: maskedSettings,
        isActive: config.isActive,
        lastTestedAt: config.lastTestedAt,
        testStatus: config.testStatus
    };
}

/**
 * Save notification configuration
 * @param {string} type - 'SMTP' | 'SMS'
 * @param {string} provider - Provider name
 * @param {Object} settings - Configuration settings
 * @returns {Promise<Object>} - Saved config
 */
async function saveConfig(type, provider, settings) {
    // Encrypt sensitive fields
    const encryptedSettings = { ...settings };

    // For SMTP
    if (type === 'SMTP' && settings.password) {
        encryptedSettings.encryptedPassword = encrypt(settings.password);
        delete encryptedSettings.password;
    }

    // For SMS
    if (type === 'SMS' && settings.authToken) {
        encryptedSettings.encryptedAuthToken = encrypt(settings.authToken);
        delete encryptedSettings.authToken;
    }

    const config = await NotificationConfig.findOneAndUpdate(
        { type },
        {
            type,
            provider,
            settings: encryptedSettings,
            testStatus: 'not_tested'
        },
        { upsert: true, new: true }
    );

    // Clear SMTP cache if applicable
    if (type === 'SMTP') {
        const smtpService = require('./smtpService');
        smtpService.clearCache();
    }

    return config;
}

/**
 * Send notification (main entry point)
 * @param {Object} options - Notification options
 * @param {string} options.channel - 'email' | 'sms' | 'both'
 * @param {string} options.templateName - Template name
 * @param {Object} options.to - { email, phone }
 * @param {Object} options.data - Template data
 * @param {Date} options.sendAt - Optional scheduled send time
 * @param {Object} options.metadata - Additional context
 * @returns {Promise<Object>} - { success, jobIds, logIds }
 */
async function sendNotification({ channel, templateName, to, data, sendAt, metadata = {} }) {
    try {
        // Validate template exists and is enabled
        const template = await Template.findOne({ name: templateName, enabled: true });

        if (!template) {
            throw new Error(`Template "${templateName}" not found or is disabled`);
        }

        const jobIds = [];
        const logIds = [];

        // Send email
        if ((channel === 'email' || channel === 'both') && to.email) {
            if (!template.channels.includes('email')) {
                throw new Error(`Template "${templateName}" does not support email channel`);
            }

            // Create log entry
            const log = await NotificationLog.create({
                templateName,
                channel: 'email',
                recipient: to.email,
                recipientUserId: to.userId,
                status: 'PENDING',
                scheduledAt: sendAt || new Date(),
                metadata
            });

            // Queue job
            const job = await notificationQueue.add(
                {
                    logId: log._id.toString(),
                    channel: 'email',
                    templateName,
                    to: to.email,
                    data
                },
                {
                    delay: sendAt ? new Date(sendAt) - new Date() : 0
                }
            );

            await NotificationLog.findByIdAndUpdate(log._id, { jobId: job.id });

            jobIds.push(job.id);
            logIds.push(log._id.toString());
        }

        // Send SMS (placeholder for future)
        if ((channel === 'sms' || channel === 'both') && to.phone) {
            if (!template.channels.includes('sms')) {
                throw new Error(`Template "${templateName}" does not support SMS channel`);
            }

            // SMS implementation will be added later
            logger.warn('SMS channel not yet implemented', { templateName, phone: to.phone });
        }

        return {
            success: true,
            jobIds,
            logIds
        };
    } catch (error) {
        logger.error('Failed to send notification', {
            channel,
            templateName,
            error: error.message
        });
        throw error;
    }
}

/**
 * Get notification logs with pagination and filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - { logs, pagination }
 */
async function getLogs(filters = {}) {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.channel) {
        query.channel = filters.channel;
    }

    if (filters.recipient) {
        query.recipient = { $regex: filters.recipient, $options: 'i' };
    }

    if (filters.templateName) {
        query.templateName = filters.templateName;
    }

    if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
            query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
            const endDate = new Date(filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt.$lte = endDate;
        }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        NotificationLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('recipientUserId', 'name email'),
        NotificationLog.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Retry a failed notification
 * @param {string} logId - NotificationLog ID
 * @returns {Promise<Object>} - { success, jobId }
 */
async function retryNotification(logId) {
    const log = await NotificationLog.findById(logId);

    if (!log) {
        throw new Error('Notification log not found');
    }

    if (log.status === 'SENT') {
        throw new Error('Cannot retry a successfully sent notification');
    }

    if (log.attempts >= 5) {
        throw new Error('Maximum retry attempts reached');
    }

    // Re-queue the job
    const job = await notificationQueue.add({
        logId: log._id.toString(),
        channel: log.channel,
        templateName: log.templateName,
        to: log.recipient,
        data: log.metadata.templateData || {}
    });

    await NotificationLog.findByIdAndUpdate(logId, {
        jobId: job.id,
        status: 'PENDING'
    });

    return {
        success: true,
        jobId: job.id
    };
}

/**
 * Bulk retry failed notifications
 * @param {Array<string>} logIds - Array of log IDs
 * @returns {Promise<Object>} - { success, retriedCount }
 */
async function bulkRetry(logIds) {
    let retriedCount = 0;

    for (const logId of logIds) {
        try {
            await retryNotification(logId);
            retriedCount++;
        } catch (error) {
            logger.error('Bulk retry failed for log', { logId, error: error.message });
        }
    }

    return {
        success: true,
        retriedCount,
        total: logIds.length
    };
}

/**
 * Get notification statistics
 * @returns {Promise<Object>}
 */
async function getStats() {
    const [total, pending, sent, failed] = await Promise.all([
        NotificationLog.countDocuments(),
        NotificationLog.countDocuments({ status: 'PENDING' }),
        NotificationLog.countDocuments({ status: 'SENT' }),
        NotificationLog.countDocuments({ status: 'FAILED' })
    ]);

    return {
        total,
        pending,
        sent,
        failed,
        failureRate: total > 0 ? ((failed / total) * 100).toFixed(2) : 0
    };
}

module.exports = {
    notificationQueue,
    getConfig,
    saveConfig,
    sendNotification,
    getLogs,
    retryNotification,
    bulkRetry,
    getStats
};
