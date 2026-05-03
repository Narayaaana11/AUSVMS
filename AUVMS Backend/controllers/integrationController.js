const createError = require('http-errors');
const Integration = require('../models/Integration');

// Get all integrations
exports.getAllIntegrations = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 25, type = 'all' } = req.query;
        const numericPage = Math.max(parseInt(page, 10) || 1, 1);
        const numericPageSize = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 200);

        const filter = {};
        if (type && type !== 'all') {
            filter.type = type;
        }

        const [items, total] = await Promise.all([
            Integration.find(filter)
                .select('-apiSecret')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 })
                .skip((numericPage - 1) * numericPageSize)
                .limit(numericPageSize),
            Integration.countDocuments(filter),
        ]);

        res.json({ items, total, page: numericPage, pageSize: numericPageSize });
    } catch (err) {
        next(err);
    }
};

// Get single integration
exports.getIntegrationById = async (req, res, next) => {
    try {
        const integration = await Integration.findById(req.params.id)
            .select('-apiSecret')
            .populate('createdBy', 'name email');
        if (!integration) return next(createError(404, 'Integration not found'));
        res.json(integration);
    } catch (err) {
        next(err);
    }
};

// Create integration
exports.createIntegration = async (req, res, next) => {
    try {
        const { name, type, apiKey, apiSecret, webhookUrl, webhookEvents, metadata } = req.body;

        if (!name || !type) {
            return next(createError(400, 'Missing required fields'));
        }

        const integration = new Integration({
            name,
            type,
            apiKey,
            apiSecret,
            webhookUrl,
            webhookEvents: webhookEvents || [],
            metadata,
            createdBy: req.user._id,
        });

        const saved = await integration.save();
        const result = saved.toObject();
        delete result.apiSecret;
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

// Update integration
exports.updateIntegration = async (req, res, next) => {
    try {
        const { name, isActive, apiKey, apiSecret, webhookUrl, webhookEvents, metadata, connectionStatus } = req.body;

        const integration = await Integration.findByIdAndUpdate(
            req.params.id,
            {
                ...(name && { name }),
                ...(isActive !== undefined && { isActive }),
                ...(apiKey && { apiKey }),
                ...(apiSecret && { apiSecret }),
                ...(webhookUrl && { webhookUrl }),
                ...(webhookEvents && { webhookEvents }),
                ...(metadata && { metadata }),
                ...(connectionStatus && { connectionStatus }),
                lastSyncedAt: new Date(),
            },
            { new: true, runValidators: true }
        ).select('-apiSecret');

        if (!integration) return next(createError(404, 'Integration not found'));
        res.json(integration);
    } catch (err) {
        next(err);
    }
};

// Delete integration
exports.deleteIntegration = async (req, res, next) => {
    try {
        const integration = await Integration.findByIdAndDelete(req.params.id);
        if (!integration) return next(createError(404, 'Integration not found'));
        res.json({ message: 'Integration deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// Test integration connection
exports.testIntegration = async (req, res, next) => {
    try {
        const { id } = req.params;
        const integration = await Integration.findById(id);
        if (!integration) return next(createError(404, 'Integration not found'));

        // Mock test - in real scenario, would attempt actual connection
        const isConnected = !!(integration.apiKey && integration.webhookUrl);

        if (isConnected) {
            integration.connectionStatus = 'connected';
            integration.lastSyncedAt = new Date();
        } else {
            integration.connectionStatus = 'error';
        }

        await integration.save();
        res.json({ connected: isConnected, status: integration.connectionStatus });
    } catch (err) {
        next(err);
    }
};
