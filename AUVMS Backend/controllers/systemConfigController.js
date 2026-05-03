const SystemConfig = require('../models/SystemConfig');
const createError = require('http-errors');

exports.getConfig = async (req, res, next) => {
    try {
        const { key } = req.params;
        const config = await SystemConfig.findOne({ key });
        if (!config) {
            // Return empty default or 404? Let's return null value to indicate not set
            return res.json({ key, value: null });
        }
        res.json(config);
    } catch (err) {
        next(err);
    }
};

exports.updateConfig = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!key || value === undefined) {
            return next(createError(400, 'Key and value are required'));
        }

        const config = await SystemConfig.findOneAndUpdate(
            { key },
            { value, updatedBy: req.user._id },
            { new: true, upsert: true }
        );

        res.json(config);
    } catch (err) {
        next(err);
    }
};

exports.getAllConfigs = async (req, res, next) => {
    try {
        const configs = await SystemConfig.find({});
        const map = {};
        configs.forEach(c => { map[c.key] = c.value; });
        res.json(map);
    } catch (err) {
        next(err);
    }
};
