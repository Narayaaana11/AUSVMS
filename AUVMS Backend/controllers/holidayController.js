const createError = require('http-errors');
const Holiday = require('../models/Holiday');

// Get all holidays
exports.getAllHolidays = async (req, res, next) => {
    try {
        const { page = 1, pageSize = 25, type = 'all' } = req.query;
        const numericPage = Math.max(parseInt(page, 10) || 1, 1);
        const numericPageSize = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 200);

        const filter = {};
        if (type && type !== 'all') {
            filter.type = type;
        }

        const [items, total] = await Promise.all([
            Holiday.find(filter)
                .populate('createdBy', 'name email')
                .sort({ date: -1 })
                .skip((numericPage - 1) * numericPageSize)
                .limit(numericPageSize),
            Holiday.countDocuments(filter),
        ]);

        res.json({ items, total, page: numericPage, pageSize: numericPageSize });
    } catch (err) {
        next(err);
    }
};

// Get single holiday
exports.getHolidayById = async (req, res, next) => {
    try {
        const holiday = await Holiday.findById(req.params.id).populate('createdBy', 'name email');
        if (!holiday) return next(createError(404, 'Holiday not found'));
        res.json(holiday);
    } catch (err) {
        next(err);
    }
};

// Create holiday
exports.createHoliday = async (req, res, next) => {
    try {
        const { name, type, date, description, affectedDepartments, affectedLocations, appointmentsAllowed, impactLevel } = req.body;

        if (!name || !date) {
            return next(createError(400, 'Missing required fields'));
        }

        const holiday = new Holiday({
            name,
            type,
            date: new Date(date),
            description,
            affectedDepartments: affectedDepartments || [],
            affectedLocations: affectedLocations || [],
            appointmentsAllowed: appointmentsAllowed ?? false,
            impactLevel,
            createdBy: req.user._id,
        });

        const saved = await holiday.save();
        res.status(201).json(saved);
    } catch (err) {
        next(err);
    }
};

// Update holiday
exports.updateHoliday = async (req, res, next) => {
    try {
        const { name, type, date, description, affectedDepartments, affectedLocations, appointmentsAllowed, impactLevel } = req.body;

        const holiday = await Holiday.findByIdAndUpdate(
            req.params.id,
            {
                ...(name && { name }),
                ...(type && { type }),
                ...(date && { date: new Date(date) }),
                ...(description !== undefined && { description }),
                ...(affectedDepartments && { affectedDepartments }),
                ...(affectedLocations && { affectedLocations }),
                ...(appointmentsAllowed !== undefined && { appointmentsAllowed }),
                ...(impactLevel && { impactLevel }),
            },
            { new: true, runValidators: true }
        );

        if (!holiday) return next(createError(404, 'Holiday not found'));
        res.json(holiday);
    } catch (err) {
        next(err);
    }
};

// Delete holiday
exports.deleteHoliday = async (req, res, next) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);
        if (!holiday) return next(createError(404, 'Holiday not found'));
        res.json({ message: 'Holiday deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// Get upcoming holidays
exports.getUpcomingHolidays = async (req, res, next) => {
    try {
        const holidays = await Holiday.find({
            date: { $gte: new Date() },
        })
            .sort({ date: 1 })
            .limit(10);

        res.json(holidays);
    } catch (err) {
        next(err);
    }
};
