const createError = require('http-errors');
const dayjs = require('dayjs');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

/**
 * GET /api/analytics/overview
 * Returns all top and secondary KPIs for the admin dashboard
 * Only accessible by ADMIN role
 */
exports.getOverview = async (req, res, next) => {
    try {
        const now = dayjs();
        const startOfToday = now.startOf('day').toDate();
        const endOfToday = now.endOf('day').toDate();
        const startOfMonth = now.startOf('month').toDate();
        const endOfMonth = now.endOf('month').toDate();
        const last30Days = now.subtract(30, 'days').startOf('day').toDate();

        // Active Visitors: checked-in but not checked-out
        const activeVisitors = await Visitor.countDocuments({
            status: 'checked-in',
            checkInAt: { $exists: true },
            checkOutAt: null,
        });

        // Checked Out Today
        const checkedOutToday = await Visitor.countDocuments({
            checkOutAt: { $gte: startOfToday, $lte: endOfToday },
        });

        // Total Users (active only)
        const totalUsers = await User.countDocuments({ isActive: true });

        // Pending Approvals (visitors with pending status)
        const pendingApprovals = await Visitor.countDocuments({
            status: 'pending',
        });

        // Total Visitors This Month (based on checkInAt)
        const totalVisitorsThisMonth = await Visitor.countDocuments({
            checkInAt: { $gte: startOfMonth, $lte: endOfMonth },
        });

        // Avg Visit Duration (in minutes) for current month
        const visitDurationData = await Visitor.aggregate([
            {
                $match: {
                    checkInAt: { $gte: startOfMonth, $lte: endOfMonth },
                    checkOutAt: { $exists: true, $ne: null },
                },
            },
            {
                $project: {
                    durationMinutes: {
                        $divide: [{ $subtract: ['$checkOutAt', '$checkInAt'] }, 1000 * 60],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    avgDuration: { $avg: '$durationMinutes' },
                },
            },
        ]);
        const avgVisitDurationMinutes = visitDurationData[0]?.avgDuration
            ? Math.round(visitDurationData[0].avgDuration)
            : 0;

        // Success Rate: % of approved visitors vs total for current month
        const [approvedCount, totalAppointments] = await Promise.all([
            Visitor.countDocuments({
                status: 'approved',
                createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            }),
            Visitor.countDocuments({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            }),
        ]);
        const successRate =
            totalAppointments > 0
                ? Math.round((approvedCount / totalAppointments) * 100)
                : 0;

        // Peak Hour: Find the hour with most check-ins in last 30 days
        const peakHourData = await Visitor.aggregate([
            {
                $match: {
                    checkInAt: { $gte: last30Days },
                },
            },
            {
                $project: {
                    hour: { $hour: '$checkInAt' },
                },
            },
            {
                $group: {
                    _id: '$hour',
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
            {
                $limit: 1,
            },
        ]);

        let peakHour = '10:00 AM - 12:00 PM'; // Default
        if (peakHourData.length > 0) {
            const hour = peakHourData[0]._id;
            const startHour = hour % 12 === 0 ? 12 : hour % 12;
            const endHour = (hour + 2) % 12 === 0 ? 12 : (hour + 2) % 12;
            const startPeriod = hour >= 12 ? 'PM' : 'AM';
            const endPeriod = hour + 2 >= 12 ? 'PM' : 'AM';
            peakHour = `${startHour}:00 ${startPeriod} - ${endHour}:00 ${endPeriod}`;
        }

        res.json({
            success: true,
            data: {
                activeVisitors,
                checkedOutToday,
                totalUsers,
                pendingApprovals,
                totalVisitorsThisMonth,
                avgVisitDurationMinutes,
                successRate,
                peakHour,
            },
            message: 'Analytics overview loaded.',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/analytics/visitor-trends?range=7d|30d
 * Returns daily visitor counts for line chart
 * Default: last 7 days
 */
exports.getVisitorTrends = async (req, res, next) => {
    try {
        const { range = '7d' } = req.query;
        const days = range === '30d' ? 30 : 7;

        const startDate = dayjs().subtract(days, 'days').startOf('day').toDate();
        const endDate = dayjs().endOf('day').toDate();

        const trends = await Visitor.aggregate([
            {
                $match: {
                    checkInAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$checkInAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    count: 1,
                },
            },
        ]);

        res.json({
            success: true,
            data: trends,
            message: 'Visitor trends loaded.',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/analytics/department-distribution?range=30d
 * Returns visitor counts by department for bar chart
 * Default: last 30 days
 */
exports.getDepartmentDistribution = async (req, res, next) => {
    try {
        const { range = '30d' } = req.query;
        const days = parseInt(range) || 30;

        const startDate = dayjs().subtract(days, 'days').startOf('day').toDate();
        const endDate = dayjs().endOf('day').toDate();

        const distribution = await Visitor.aggregate([
            {
                $match: {
                    checkInAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        $ifNull: ['$department', 'Unknown'],
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
            {
                $project: {
                    _id: 0,
                    department: '$_id',
                    count: 1,
                },
            },
        ]);

        res.json({
            success: true,
            data: distribution,
            message: 'Department distribution loaded.',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/analytics/processing-metrics
 * Returns processing metrics for the last 30 days
 */
exports.getProcessingMetrics = async (req, res, next) => {
    try {
        const now = dayjs();
        const last30Days = now.subtract(30, 'days').startOf('day').toDate();
        const startOfMonth = now.startOf('month').toDate();
        const endOfMonth = now.endOf('month').toDate();

        // Avg Processing Time: Time from visitor request creation to status change
        // We'll calculate this by finding visitors that have updatedAt != createdAt
        // and status is approved or rejected
        const processingTimeData = await Visitor.aggregate([
            {
                $match: {
                    createdAt: { $gte: last30Days },
                    status: { $in: ['approved', 'rejected'] },
                },
            },
            {
                $project: {
                    processingTimeHours: {
                        $divide: [
                            { $subtract: ['$updatedAt', '$createdAt'] },
                            1000 * 60 * 60,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    avgProcessingTime: { $avg: '$processingTimeHours' },
                },
            },
        ]);
        const avgProcessingTimeHours = processingTimeData[0]?.avgProcessingTime
            ? parseFloat(processingTimeData[0].avgProcessingTime.toFixed(1))
            : 0;

        // Avg Visit Duration (same as overview, but explicit here)
        const visitDurationData = await Visitor.aggregate([
            {
                $match: {
                    checkInAt: { $gte: startOfMonth, $lte: endOfMonth },
                    checkOutAt: { $exists: true, $ne: null },
                },
            },
            {
                $project: {
                    durationMinutes: {
                        $divide: [{ $subtract: ['$checkOutAt', '$checkInAt'] }, 1000 * 60],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    avgDuration: { $avg: '$durationMinutes' },
                },
            },
        ]);
        const avgVisitDurationMinutes = visitDurationData[0]?.avgDuration
            ? Math.round(visitDurationData[0].avgDuration)
            : 0;

        // Monthly Visitors
        const monthlyVisitors = await Visitor.countDocuments({
            checkInAt: { $gte: startOfMonth, $lte: endOfMonth },
        });

        res.json({
            success: true,
            data: {
                avgProcessingTimeHours,
                avgVisitDurationMinutes,
                monthlyVisitors,
            },
            message: 'Processing metrics loaded.',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/analytics/staff-overview
 * Returns KPIs for the logged-in staff member
 */
exports.getStaffOverview = async (req, res, next) => {
    try {
        const staffId = req.user._id;
        const now = dayjs();
        const startOfToday = now.startOf('day').toDate();
        const endOfToday = now.endOf('day').toDate();

        // Parallel queries for performance
        const [
            totalAppointments,
            pendingRequests,
            approvedToday,
            deniedRequests,
            insideCampus,
            completedToday
        ] = await Promise.all([
            // Total All Time
            Visitor.countDocuments({ staffId }),
            // Pending
            Visitor.countDocuments({ staffId, status: 'pending' }),
            // Approved Today (status approved OR checked-in/out but created/updated to approved today? simpler: status approved, today?)
            // "Approved Today" usually means appointments scheduled for today that are approved, OR actioned today.
            // Let's go with: Status is usually 'approved' or 'checked-in'/'completed' and dateOfVisit is today.
            // Actually, user requirement says: "status changed to APPROVED today". Logic: use updatedAt or just count approved for today's visits?
            // "approvedToday (status changed to APPROVED today)" -> This implies using AppointmentLog is best, but specific status query is faster.
            // Let's approximate: Visitors with status 'approved' updated today.
            Visitor.countDocuments({
                staffId,
                status: 'approved',
                updatedAt: { $gte: startOfToday, $lte: endOfToday }
            }),
            // Denied (Rejected) - All time or recent? "deniedRequests" usually implies active attention or total count. 
            // The UI card just says "Denied Requests". Let's do all time count of rejected.
            Visitor.countDocuments({ staffId, status: 'rejected' }),
            // Inside Campus
            Visitor.countDocuments({ staffId, status: 'checked-in' }),
            // Completed Today
            Visitor.countDocuments({
                staffId,
                status: 'completed',
                updatedAt: { $gte: startOfToday, $lte: endOfToday }
            })
        ]);

        res.json({
            success: true,
            data: {
                totalAppointments,
                pendingRequests,
                approvedToday,
                deniedRequests,
                insideCampus,
                completedToday
            },
            message: 'Staff overview loaded'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/analytics/activity/recent
 * Returns recent activity for the staff member
 */
exports.getRecentActivity = async (req, res, next) => {
    try {
        const staffId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;

        // 1. Get all visitor IDs for this staff to filter logs
        // This might be heavy if staff has thousands of visitors. 
        // Optimization: querying AppointmentLog with lookup on Visitor is better but requires aggregate.

        const AppointmentLog = require('../models/AppointmentLog'); // Lazy load

        const logs = await AppointmentLog.aggregate([
            // Join with Visitor to filter by staffId
            {
                $lookup: {
                    from: 'visitors',
                    localField: 'appointmentId',
                    foreignField: '_id',
                    as: 'visitor'
                }
            },
            { $unwind: '$visitor' },
            // Filter where visitor.staffId matches current user
            {
                $match: {
                    'visitor.staffId': staffId
                }
            },
            // Sort by latest
            { $sort: { createdAt: -1 } },
            { $limit: limit },
            // Join with PerformedBy user to get name
            {
                $lookup: {
                    from: 'users',
                    localField: 'performedBy',
                    foreignField: '_id',
                    as: 'actor'
                }
            },
            { $unwind: { path: '$actor', preserveNullAndEmptyArrays: true } },
            // Project final shape
            {
                $project: {
                    id: '$_id',
                    type: '$action', // Use action as type
                    title: '$action', // Can map this to friendly title in frontend or here
                    description: { $concat: ['$visitor.name', ' - ', { $ifNull: ['$reason', '$visitor.purposeOfVisit'] }] },
                    appointmentId: '$appointmentId',
                    status: '$visitor.status', // Include current status
                    createdBy: {
                        id: '$actor._id',
                        name: '$actor.name',
                        role: '$actor.role'
                    },
                    createdAt: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: logs,
            message: 'Recent activity loaded'
        });
    } catch (err) {
        next(err);
    }
};
