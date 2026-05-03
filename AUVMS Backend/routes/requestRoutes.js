const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiters
const bulkActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 bulk actions per 15 minutes
    message: 'Too many bulk actions, please try again later',
});

const exportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Max 20 exports per hour
    message: 'Too many export requests, please try again later',
});

// All routes require authentication
router.use(protect);

// Stats endpoint (staff and admin)
router.get('/stats', authorize('staff', 'admin'), requestController.getRequestStats);

// Export endpoint (staff and admin)
router.get('/export', authorize('staff', 'admin'), exportLimiter, requestController.exportRequests);

// Bulk action endpoint (staff and admin)
router.post('/bulk-action', authorize('staff', 'admin'), bulkActionLimiter, requestController.bulkAction);

// Get all requests (staff and admin)
router.get('/', authorize('staff', 'admin'), requestController.getRequests);

// Get single request by ID (staff and admin)
router.get('/:id', authorize('staff', 'admin'), requestController.getRequestById);

// Approve request (staff and admin)
router.post('/:id/approve', authorize('staff', 'admin'), requestController.approveRequest);

// Reject request (staff and admin)
router.post('/:id/reject', authorize('staff', 'admin'), requestController.rejectRequest);

// Reschedule request (staff and admin)
router.patch('/:id/reschedule', authorize('staff', 'admin'), requestController.rescheduleRequest);

// Get appointment logs (staff and admin)
router.get('/:id/logs', authorize('staff', 'admin'), requestController.getAppointmentLogs);

// Regenerate OTP (admin only)
router.post('/:id/otp/regenerate', authorize('admin'), requestController.regenerateOTP);

module.exports = router;
