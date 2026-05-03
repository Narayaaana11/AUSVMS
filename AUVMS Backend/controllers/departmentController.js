const createError = require('http-errors');
const Department = require('../models/Department');
const Visitor = require('../models/Visitor');

// Get all departments with visitor counts
exports.getAllDepartments = async (req, res, next) => {
    try {
        const { isActive } = req.query;

        // Build filter
        const filter = {};
        if (isActive !== undefined && isActive !== 'all') {
            filter.isActive = isActive === 'true';
        }

        // Fetch departments
        const departments = await Department.find(filter).sort({ createdAt: -1 });

        // Aggregate visitor counts by department
        // TODO: Add date range filtering for visitor counts
        const visitorCounts = await Visitor.aggregate([
            {
                $match: {
                    department: { $exists: true, $ne: null, $ne: '' },
                },
            },
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Create a map of department name -> visitor count
        const visitorCountMap = {};
        visitorCounts.forEach((item) => {
            visitorCountMap[item._id] = item.count;
        });

        // Attach visitor counts to departments
        const departmentsWithCounts = departments.map((dept) => {
            const deptObj = dept.toObject();
            deptObj.visitorCount = visitorCountMap[dept.name] || 0;
            return deptObj;
        });

        // Calculate summary stats
        const totalDepartments = departments.length;
        const activeDepartments = departments.filter((d) => d.isActive).length;

        // Count unique locations (buildings)
        const uniqueLocations = new Set(
            departments
                .filter((d) => d.officeLocation)
                .map((d) => d.officeLocation)
        ).size;

        res.json({
            success: true,
            data: {
                departments: departmentsWithCounts,
                totalDepartments,
                activeDepartments,
                totalLocations: uniqueLocations || totalDepartments,
            },
            message: 'Departments fetched successfully',
        });
    } catch (err) {
        next(err);
    }
};

// Get single department by ID
exports.getDepartmentById = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return next(createError(404, 'Department not found'));
        }

        // Get visitor count for this department
        const visitorCount = await Visitor.countDocuments({
            department: department.name,
        });

        const deptObj = department.toObject();
        deptObj.visitorCount = visitorCount;

        res.json({
            success: true,
            data: deptObj,
            message: 'Department fetched successfully',
        });
    } catch (err) {
        next(err);
    }
};

// Create new department
exports.createDepartment = async (req, res, next) => {
    try {
        const {
            name,
            code,
            description,
            officeLocation,
            contactEmail,
            contactPhone,
            activeHours,
        } = req.body;

        // Validate required fields
        if (!name) {
            return next(createError(400, 'Department name is required'));
        }

        // Check for duplicate name
        const existingDept = await Department.findOne({ name });
        if (existingDept) {
            return next(createError(400, 'Department with this name already exists'));
        }

        // Check for duplicate code if provided
        if (code) {
            const existingCode = await Department.findOne({ code });
            if (existingCode) {
                return next(createError(400, 'Department with this code already exists'));
            }
        }

        const department = new Department({
            name,
            code,
            description,
            officeLocation,
            contactEmail,
            contactPhone,
            activeHours: activeHours || { startTime: '09:00', endTime: '17:00' },
        });

        const saved = await department.save();

        res.status(201).json({
            success: true,
            data: saved,
            message: 'Department created successfully',
        });
    } catch (err) {
        // Handle mongoose validation errors
        if (err.name === 'ValidationError') {
            return next(createError(400, err.message));
        }
        // Handle duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return next(createError(400, `Department with this ${field} already exists`));
        }
        next(err);
    }
};

// Update department
exports.updateDepartment = async (req, res, next) => {
    try {
        const {
            name,
            code,
            description,
            officeLocation,
            contactEmail,
            contactPhone,
            activeHours,
            isActive,
        } = req.body;

        const department = await Department.findById(req.params.id);
        if (!department) {
            return next(createError(404, 'Department not found'));
        }

        // Check for duplicate name if changing
        if (name && name !== department.name) {
            const existingDept = await Department.findOne({ name });
            if (existingDept) {
                return next(createError(400, 'Department with this name already exists'));
            }
        }

        // Check for duplicate code if changing
        if (code && code !== department.code) {
            const existingCode = await Department.findOne({ code });
            if (existingCode) {
                return next(createError(400, 'Department with this code already exists'));
            }
        }

        // Update fields
        if (name !== undefined) department.name = name;
        if (code !== undefined) department.code = code;
        if (description !== undefined) department.description = description;
        if (officeLocation !== undefined) department.officeLocation = officeLocation;
        if (contactEmail !== undefined) department.contactEmail = contactEmail;
        if (contactPhone !== undefined) department.contactPhone = contactPhone;
        if (activeHours !== undefined) department.activeHours = activeHours;
        if (isActive !== undefined) department.isActive = isActive;

        const updated = await department.save();

        res.json({
            success: true,
            data: updated,
            message: 'Department updated successfully',
        });
    } catch (err) {
        // Handle mongoose validation errors
        if (err.name === 'ValidationError') {
            return next(createError(400, err.message));
        }
        // Handle duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return next(createError(400, `Department with this ${field} already exists`));
        }
        next(err);
    }
};

// Soft delete department (set isActive = false)
exports.deleteDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return next(createError(404, 'Department not found'));
        }

        // Soft delete: set isActive to false
        department.isActive = false;
        await department.save();

        res.json({
            success: true,
            message: 'Department deactivated successfully',
        });
    } catch (err) {
        next(err);
    }
};

// Get department summary
exports.getDepartmentSummary = async (req, res, next) => {
    try {
        const totalDepartments = await Department.countDocuments();
        const activeDepartments = await Department.countDocuments({ isActive: true });

        // Get unique locations
        const departments = await Department.find();
        const uniqueLocations = new Set(
            departments
                .filter((d) => d.officeLocation)
                .map((d) => d.officeLocation)
        ).size;

        // Get default active hours (most common or first department's hours)
        const firstDept = await Department.findOne();
        const defaultActiveHours = firstDept?.activeHours || {
            startTime: '09:00',
            endTime: '17:00',
        };

        res.json({
            success: true,
            data: {
                totalDepartments,
                activeDepartments,
                totalLocations: uniqueLocations || totalDepartments,
                defaultActiveHours,
            },
            message: 'Department summary fetched successfully',
        });
    } catch (err) {
        next(err);
    }
};
