/**
 * Notification Worker - Bull Queue Consumer
 * 
 * This worker processes notification jobs from the Bull queue.
 * It should be run as a separate process from the main application.
 * 
 * Usage: node jobs/notificationWorker.js
 */

require('dotenv').config();

const { notificationQueue } = require('../services/notificationService');
const NotificationLog = require('../models/NotificationLog');
const templateService = require('../services/templateService');
const smtpService = require('../services/smtpService');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        logger.info('Notification Worker connected to MongoDB');
    })
    .catch((error) => {
        logger.error('MongoDB connection error', { error: error.message });
        process.exit(1);
    });

/**
 * Process notification job
 */
notificationQueue.process(async (job) => {
    const { logId, channel, templateName, to, data } = job.data;

    logger.info('Processing notification job', {
        jobId: job.id,
        logId,
        channel,
        templateName
    });

    try {
        // Fetch NotificationLog
        const log = await NotificationLog.findById(logId);

        if (!log) {
            throw new Error('NotificationLog not found');
        }

        // Check if already sent
        if (log.status === 'SENT') {
            logger.warn('Notification already sent, skipping', { logId });
            return { status: 'ALREADY_SENT', logId };
        }

        // Increment attempts
        log.attempts += 1;
        await log.save();

        // Render template
        const rendered = await templateService.renderTemplate(templateName, data, channel);

        // Send based on channel
        if (channel === 'email') {
            // Send email via SMTP
            const result = await smtpService.sendEmail({
                to,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text
            });

            // Update log: SUCCESS
            await NotificationLog.findByIdAndUpdate(logId, {
                status: 'SENT',
                sentAt: new Date(),
                subject: rendered.subject,
                providerResponse: {
                    messageId: result.messageId,
                    response: result.response
                }
            });

            logger.info('Notification sent successfully', {
                logId,
                messageId: result.messageId
            });

            return {
                status: 'SENT',
                logId,
                messageId: result.messageId
            };
        }
        else if (channel === 'sms') {
            // SMS sending will be implemented later
            throw new Error('SMS channel not yet implemented');
        }
        else {
            throw new Error(`Unknown channel: ${channel}`);
        }
    } catch (error) {
        logger.error('Notification job failed', {
            jobId: job.id,
            logId,
            error: error.message,
            attempt: job.attemptsMade
        });

        // Update log: FAILED
        await NotificationLog.findByIdAndUpdate(logId, {
            status: 'FAILED',
            errorMessage: error.message
        });

        // Re-throw error to trigger Bull retry
        throw error;
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down notification worker');
    await notificationQueue.close();
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down notification worker');
    await notificationQueue.close();
    await mongoose.connection.close();
    process.exit(0);
});

logger.info('Notification Worker started successfully');
logger.info('Listening for notification jobs...');
