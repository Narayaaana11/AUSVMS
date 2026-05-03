const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getStats,
    getVisitorLogs,
    exportVisitorLogs,
    getDashboardAnalytics,
    getAuditLogs,
    getSystemMetrics,
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/stats', getStats);
router.get('/analytics', getDashboardAnalytics);
router.get('/visitor-logs', getVisitorLogs);
router.get('/visitor-logs/export', exportVisitorLogs);
router.get('/audit-logs', getAuditLogs);
router.get('/metrics', getSystemMetrics);

module.exports = router;


