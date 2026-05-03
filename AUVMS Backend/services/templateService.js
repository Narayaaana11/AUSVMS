const handlebars = require('handlebars');
const Template = require('../models/Template');
const logger = require('../utils/logger');

// Register safe Handlebars helpers
handlebars.registerHelper('formatDate', function (date, format) {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (format === 'short') {
            return d.toLocaleDateString();
        }
        return d.toLocaleString();
    } catch {
        return date;
    }
});

handlebars.registerHelper('uppercase', function (str) {
    return str ? str.toUpperCase() : '';
});

handlebars.registerHelper('lowercase', function (str) {
    return str ? str.toLowerCase() : '';
});

/**
 * Render a template with provided data
 * @param {string} templateName - Template name
 * @param {Object} data - Data to populate template
 * @param {string} channel - 'email' | 'sms'
 * @returns {Promise<Object>} - { subject, html, text, sms }
 */
async function renderTemplate(templateName, data, channel = 'email') {
    try {
        const template = await Template.findOne({ name: templateName, enabled: true });

        if (!template) {
            throw new Error(`Template "${templateName}" not found or is disabled`);
        }

        // Check if template supports requested channel
        if (!template.channels.includes(channel)) {
            throw new Error(`Template "${templateName}" does not support channel "${channel}"`);
        }

        const rendered = {};

        // Render subject (for email)
        if (channel === 'email' && template.title) {
            const subjectTemplate = handlebars.compile(template.title, { noEscape: false });
            rendered.subject = subjectTemplate(data);
        }

        // Render HTML body (for email)
        if (channel === 'email' && template.bodyHtml) {
            const htmlTemplate = handlebars.compile(template.bodyHtml, { noEscape: false });
            rendered.html = htmlTemplate(data);
        }

        // Render plain text body (for email fallback)
        if (channel === 'email' && template.bodyText) {
            const textTemplate = handlebars.compile(template.bodyText, { noEscape: false });
            rendered.text = textTemplate(data);
        }

        // Render SMS body
        if (channel === 'sms' && template.bodySms) {
            const smsTemplate = handlebars.compile(template.bodySms, { noEscape: false });
            rendered.sms = smsTemplate(data);

            // Enforce SMS length limit
            if (rendered.sms.length > 160) {
                logger.warn('SMS body exceeds 160 characters', {
                    templateName,
                    length: rendered.sms.length
                });
                rendered.sms = rendered.sms.substring(0, 157) + '...';
            }
        }

        return rendered;
    } catch (error) {
        logger.error('Template rendering failed', {
            templateName,
            channel,
            error: error.message
        });
        throw error;
    }
}

/**
 * Validate template syntax
 * @param {string} templateBody - Template body to validate
 * @returns {boolean}
 */
function validateTemplate(templateBody) {
    try {
        handlebars.compile(templateBody);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Extract placeholders from template
 * @param {string} templateBody - Template body
 * @returns {Array<string>} - Array of placeholder names
 */
function extractPlaceholders(templateBody) {
    const regex = /\{\{([^}]+)\}\}/g;
    const placeholders = new Set();
    let match;

    while ((match = regex.exec(templateBody)) !== null) {
        // Extract variable name (handle helpers like {{formatDate date}})
        const variable = match[1].trim().split(' ').pop();
        placeholders.add(variable);
    }

    return Array.from(placeholders);
}

/**
 * Render template preview with sample data
 * @param {string} templateName - Template name
 * @param {Object} sampleData - Sample data for preview
 * @returns {Promise<Object>} - Rendered preview
 */
async function previewTemplate(templateName, sampleData) {
    // Default sample data
    const defaultData = {
        visitorName: 'John Doe',
        staffName: 'Dr. Smith',
        date: '2025-12-20',
        time: '14:30',
        purpose: 'Meeting',
        otp: '123456',
        appointmentId: 'APT12345',
        ...sampleData
    };

    return await renderTemplate(templateName, defaultData, 'email');
}

/**
 * Get all enabled templates
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>}
 */
async function getTemplates(filters = {}) {
    const query = {};

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.enabled !== undefined) {
        query.enabled = filters.enabled;
    }

    if (filters.channel) {
        query.channels = filters.channel;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
        Template.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email'),
        Template.countDocuments(query)
    ]);

    return {
        templates,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Create a new template
 * @param {Object} templateData - Template data
 * @param {string} createdBy - User ID who created
 * @returns {Promise<Object>} - Created template
 */
async function createTemplate(templateData, createdBy) {
    // Extract placeholders from bodies
    const placeholders = new Set();

    if (templateData.bodyHtml) {
        extractPlaceholders(templateData.bodyHtml).forEach(p => placeholders.add(p));
    }
    if (templateData.bodyText) {
        extractPlaceholders(templateData.bodyText).forEach(p => placeholders.add(p));
    }
    if (templateData.bodySms) {
        extractPlaceholders(templateData.bodySms).forEach(p => placeholders.add(p));
    }

    const template = await Template.create({
        ...templateData,
        placeholders: Array.from(placeholders),
        createdBy,
        updatedBy: createdBy
    });

    return template;
}

/**
 * Update a template
 * @param {string} name - Template name
 * @param {Object} updates - Updates
 * @param {string} updatedBy - User ID who updated
 * @returns {Promise<Object>} - Updated template
 */
async function updateTemplate(name, updates, updatedBy) {
    // Re-extract placeholders if body changed
    if (updates.bodyHtml || updates.bodyText || updates.bodySms) {
        const placeholders = new Set();

        if (updates.bodyHtml) {
            extractPlaceholders(updates.bodyHtml).forEach(p => placeholders.add(p));
        }
        if (updates.bodyText) {
            extractPlaceholders(updates.bodyText).forEach(p => placeholders.add(p));
        }
        if (updates.bodySms) {
            extractPlaceholders(updates.bodySms).forEach(p => placeholders.add(p));
        }

        updates.placeholders = Array.from(placeholders);
    }

    updates.updatedBy = updatedBy;

    const template = await Template.findOneAndUpdate(
        { name },
        updates,
        { new: true, runValidators: true }
    );

    if (!template) {
        throw new Error(`Template "${name}" not found`);
    }

    return template;
}

module.exports = {
    renderTemplate,
    validateTemplate,
    extractPlaceholders,
    previewTemplate,
    getTemplates,
    createTemplate,
    updateTemplate
};
