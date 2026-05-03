const express = require('express');
const {
    dailyReport,
    monthlyReport,
    exportLogs,
    generateReport,
    scheduleReport,
    getScheduledReports,
    getEmailConfig,
    saveEmailConfig,
} = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

// Existing endpoints
router.get('/daily', dailyReport);
router.get('/monthly', monthlyReport);
router.get('/export', exportLogs);

// New endpoints
router.post('/generate', generateReport);
router.post('/schedule', scheduleReport);
router.get('/scheduled', getScheduledReports);
router.get('/email-config', getEmailConfig);
router.put('/email-config', saveEmailConfig);

module.exports = router;


