const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getOverview,
    getVisitorTrends,
    getDepartmentDistribution,
    getProcessingMetrics,
} = require('../controllers/analyticsController');

const router = express.Router();

// All analytics routes are protected
router.use(protect);

// Specific routes have role authorization applied individually

// TODO: Optionally allow 'guard' role access to overview endpoint
// router.get('/overview', authorizeRoles('admin', 'guard'), getOverview);

// Admin Analytics
router.get('/overview', authorizeRoles('admin'), getOverview);
router.get('/visitor-trends', authorizeRoles('admin'), getVisitorTrends);
router.get('/department-distribution', authorizeRoles('admin'), getDepartmentDistribution);
router.get('/processing-metrics', authorizeRoles('admin'), getProcessingMetrics);

// Staff Analytics
router.get('/staff-overview', authorizeRoles('staff', 'admin'), require('../controllers/analyticsController').getStaffOverview);
router.get('/activity/recent', authorizeRoles('staff', 'admin'), require('../controllers/analyticsController').getRecentActivity);

module.exports = router;
