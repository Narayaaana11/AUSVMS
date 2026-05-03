const nodemailer = require('nodemailer');
const NotificationConfig = require('../models/NotificationConfig');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

let cachedTransporter = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get nodemailer transporter from NotificationConfig
 * Uses caching to avoid repeated DB queries
 */
async function getTransporter() {
    // Return cached transporter if still valid
    if (cachedTransporter && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
        return cachedTransporter;
    }

    const config = await NotificationConfig.findOne({ type: 'SMTP', isActive: true });

    if (!config) {
        throw new Error('SMTP configuration not found. Please configure SMTP in Admin Panel.');
    }

    const { settings } = config;

    // Decrypt password
    const password = settings.encryptedPassword ? decrypt(settings.encryptedPassword) : '';

    // Create transporter based on provider
    let transporterConfig;

    if (config.provider === 'gmail') {
        // Gmail shorthand
        transporterConfig = {
            service: 'gmail',
            auth: {
                user: settings.authEmail || settings.senderEmail,
                pass: password
            }
        };
    } else {
        // Generic SMTP
        transporterConfig = {
            host: settings.host,
            port: settings.port || 587,
            secure: settings.secure || false, // true for 465, false for other ports
            auth: {
                user: settings.authEmail,
                pass: password
            },
            tls: {
                rejectUnauthorized: false // Allow self-signed certificates (optional)
            }
        };
    }

    cachedTransporter = nodemailer.createTransporter(transporterConfig);
    cacheTime = Date.now();

    return cachedTransporter;
}

/**
 * Clear the cached transporter (call after config changes)
 */
function clearCache() {
    cachedTransporter = null;
    cacheTime = null;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body
 * @param {string} options.from - Sender (optional, uses config default)
 * @returns {Object} - nodemailer response
 */
async function sendEmail({ to, subject, html, text, from }) {
    try {
        const transporter = await getTransporter();
        const config = await NotificationConfig.findOne({ type: 'SMTP', isActive: true });

        // Build from address
        const fromAddress = from || (config?.settings?.senderEmail
            ? `"${config.settings.senderName || 'Aditya University'}" <${config.settings.senderEmail}>`
            : undefined);

        const mailOptions = {
            from: fromAddress,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML as fallback
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Email sent successfully', {
            messageId: info.messageId,
            to,
            subject
        });

        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        logger.error('Failed to send email', {
            error: error.message,
            to,
            subject
        });

        throw error;
    }
}

/**
 * Verify SMTP connection
 * @returns {Promise<boolean>}
 */
async function verifyConnection() {
    try {
        const transporter = await getTransporter();
        await transporter.verify();
        return true;
    } catch (error) {
        logger.error('SMTP verification failed', { error: error.message });
        return false;
    }
}

/**
 * Send a test email
 * @param {string} to - Test recipient
 * @returns {Object} - Send result
 */
async function sendTestEmail(to) {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Test Email from Aditya University VMS</h2>
      <p>This is a test email from your Visitor Management System.</p>
      <p>If you received this email, your SMTP configuration is working correctly!</p>
      <hr style="border: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        Sent at: ${new Date().toLocaleString()}<br>
        System: Visitor Management System
      </p>
    </div>
  `;

    return await sendEmail({
        to,
        subject: 'Test Email - VMS Notification System',
        html,
        text: 'This is a test email from Aditya University Visitor Management System. If you received this, your SMTP configuration is working correctly!'
    });
}

module.exports = {
    getTransporter,
    clearCache,
    sendEmail,
    verifyConnection,
    sendTestEmail
};
