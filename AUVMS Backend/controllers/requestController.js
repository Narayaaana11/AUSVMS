const createError = require('http-errors');
const RequestService = require('../services/requestService');
const CsvExporter = require('../utils/csvExporter');
const Appointment = require('../models/Appointment');
const AppointmentLog = require('../models/AppointmentLog');
const logger = require('../utils/logger');

/**
 * Request Controller
 * Handles incoming appointment requests for staff/admin
 */

/**
 * GET /api/requests
 * Get paginated and filtered requests
 */
exports.getRequests = async (req, res, next) => {
    try {
        const filters = {
            page: req.query.page,
            limit: req.query.limit,
            search: req.query.search,
            status: req.query.status,
            staffId: req.query.staffId,
            departmentId: req.query.departmentId,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
        };

        const result = await RequestService.getRequests(filters, req.user);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error('getRequests error:', error);
        next(createError(500, error.message));
    }
};

/**
 * GET /api/requests/:id
 * Get single request by ID with logs
 */
exports.getRequestById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const appointment = await RequestService.getRequestById(id, req.user);

        res.json({
            success: true,
            data: appointment,
        });
    } catch (error) {
        logger.error('getRequestById error:', error);

        if (error.message === 'Appointment not found') {
            return next(createError(404, error.message));
        }

        if (error.message === 'Unauthorized access') {
            return next(createError(403, error.message));
        }

        next(createError(500, error.message));
    }
};

/**
 * POST /api/requests/:id/approve
 * Approve a single request
 */
exports.approveRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { scheduledStart, scheduledEnd, note } = req.body;

        const data = {
            scheduledStart,
            scheduledEnd,
            note,
            ipAddress: req.ip,
        };

        const appointment = await RequestService.approveRequest(id, data, req.user);

        res.json({
            success: true,
            message: 'Appointment approved successfully',
            data: appointment,
        });
    } catch (error) {
        logger.error('approveRequest error:', error);

        if (error.message === 'Appointment not found') {
            return next(createError(404, error.message));
        }

        if (error.message === 'Unauthorized access') {
            return next(createError(403, error.message));
        }

        if (error.message.includes('Cannot approve') || error.message.includes('Cannot schedule')) {
            return next(createError(400, error.message));
        }

        next(createError(500, error.message));
    }
};

/**
 * POST /api/requests/:id/reject
 * Reject a single request
 */
exports.rejectRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length === 0) {
            return next(createError(400, 'Rejection reason is required'));
        }

        const data = {
            reason,
            ipAddress: req.ip,
        };

        const appointment = await RequestService.rejectRequest(id, data, req.user);

        res.json({
            success: true,
            message: 'Appointment rejected successfully',
            data: appointment,
        });
    } catch (error) {
        logger.error('rejectRequest error:', error);

        if (error.message === 'Appointment not found') {
            return next(createError(404, error.message));
        }

        if (error.message === 'Unauthorized access') {
            return next(createError(403, error.message));
        }

        if (error.message.includes('Cannot reject')) {
            return next(createError(400, error.message));
        }

        next(createError(500, error.message));
    }
};

/**
 * PATCH /api/requests/:id/reschedule
 * Reschedule a request
 */
exports.rescheduleRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPreferredDate, newPreferredTime, reason } = req.body;

        if (!newPreferredDate || !newPreferredTime) {
            return next(createError(400, 'New preferred date and time are required'));
        }

        if (!reason || reason.trim().length === 0) {
            return next(createError(400, 'Reschedule reason is required'));
        }

        const data = {
            newPreferredDate,
            newPreferredTime,
            reason,
            ipAddress: req.ip,
        };

        const appointment = await RequestService.rescheduleRequest(id, data, req.user);

        res.json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: appointment,
        });
    } catch (error) {
        logger.error('rescheduleRequest error:', error);

        if (error.message === 'Appointment not found') {
            return next(createError(404, error.message));
        }

        if (error.message === 'Unauthorized access') {
            return next(createError(403, error.message));
        }

        if (error.message.includes('Cannot reschedule') || error.message.includes('past date')) {
            return next(createError(400, error.message));
        }

        next(createError(500, error.message));
    }
};

/**
 * POST /api/requests/bulk-action
 * Bulk approve or reject appointments
 */
exports.bulkAction = async (req, res, next) => {
    try {
        const { action, appointmentIds, reason, scheduledStart } = req.body;

        if (!action || !['APPROVE', 'REJECT'].includes(action)) {
            return next(createError(400, 'Invalid action. Must be APPROVE or REJECT'));
        }

        if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
            return next(createError(400, 'Appointment IDs are required'));
        }

        if (appointmentIds.length > 200) {
            return next(createError(400, 'Maximum 200 appointments can be processed at once'));
        }

        const data = {
            action,
            appointmentIds,
            reason,
            scheduledStart,
            ipAddress: req.ip,
        };

        const results = await RequestService.bulkAction(data, req.user);

        res.json({
            success: true,
            message: `Bulk ${action.toLowerCase()} completed`,
            data: results,
        });
    } catch (error) {
        logger.error('bulkAction error:', error);
        next(createError(500, error.message));
    }
};

/**
 * GET /api/requests/:id/logs
 * Get audit logs for a specific appointment
 */
exports.getAppointmentLogs = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify appointment exists and user has access
        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return next(createError(404, 'Appointment not found'));
        }

        // Check permissions
        if (req.user.role === 'staff' && appointment.staffId?.toString() !== req.user._id.toString()) {
            return next(createError(403, 'Unauthorized access'));
        }

        const logs = await AppointmentLog.find({ appointmentId: id })
            .populate('performedBy', 'name email role')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: logs,
        });
    } catch (error) {
        logger.error('getAppointmentLogs error:', error);
        next(createError(500, error.message));
    }
};

/**
 * GET /api/requests/export
 * Export requests to CSV
 */
exports.exportRequests = async (req, res, next) => {
    try {
        const filters = {
            status: req.query.status,
            staffId: req.query.staffId,
            departmentId: req.query.departmentId,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
        };

        // Build query
        const query = {};

        // Role-based filtering
        if (req.user.role === 'staff') {
            query.staffId = req.user._id;
        } else if (filters.staffId) {
            query.staffId = filters.staffId;
        }

        if (filters.status) {
            query.status = filters.status.toUpperCase();
        }

        if (filters.departmentId) {
            query.departmentId = filters.departmentId;
        }

        if (filters.fromDate || filters.toDate) {
            query.preferredDate = {};
            if (filters.fromDate) {
                query.preferredDate.$gte = new Date(filters.fromDate);
            }
            if (filters.toDate) {
                query.preferredDate.$lte = new Date(filters.toDate);
            }
        }

        // Create query for streaming
        const appointmentQuery = Appointment.find(query)
            .populate('staffId', 'name')
            .populate('departmentId', 'name')
            .sort({ createdAt: -1 });

        // Stream CSV to response
        await CsvExporter.streamAppointmentsCsv(appointmentQuery, res, 'requests-export.csv');
    } catch (error) {
        logger.error('exportRequests error:', error);

        if (!res.headersSent) {
            next(createError(500, error.message));
        }
    }
};

/**
 * POST /api/requests/:id/otp/regenerate
 * Regenerate OTP for an appointment (Admin only)
 */
exports.regenerateOTP = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Admin-only check
        if (req.user.role !== 'admin') {
            return next(createError(403, 'Only admins can regenerate OTP'));
        }

        const result = await RequestService.regenerateOTP(id, req.user);

        res.json({
            success: true,
            message: 'OTP regenerated successfully',
            data: result,
        });
    } catch (error) {
        logger.error('regenerateOTP error:', error);

        if (error.message === 'Appointment not found') {
            return next(createError(404, error.message));
        }

        next(createError(500, error.message));
    }
};

/**
 * GET /api/requests/stats
 * Get request statistics
 * Response includes: total, pending, approved, rejected, rescheduled, completed
 */
exports.getRequestStats = async (req, res, next) => {
    try {
        const Visitor = require('../models/Visitor');
        const query = {};

        // Role-based filtering - staff only sees their own appointments
        if (req.user.role === 'staff') {
            query.staffId = req.user._id;
        }

        const [
            total,
            pending,
            approved,
            rejected,
            rescheduled,
            completed,
        ] = await Promise.all([
            Visitor.countDocuments(query),
            Visitor.countDocuments({ ...query, status: 'pending' }),
            Visitor.countDocuments({ ...query, status: 'approved' }),
            Visitor.countDocuments({ ...query, status: 'rejected' }),
            Visitor.countDocuments({ ...query, status: 'rescheduled' }),
            Visitor.countDocuments({ ...query, status: 'completed' }),
        ]);

        res.json({
            success: true,
            data: {
                totalRequests: total,
                pendingRequests: pending,
                approvedRequests: approved,
                rejectedRequests: rejected,
                rescheduledRequests: rescheduled,
                completedRequests: completed,
            },
        });
    } catch (error) {
        logger.error('getRequestStats error:', error);
        next(createError(500, error.message));
    }
};

module.exports = exports;
