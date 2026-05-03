const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { otpResendLimiter } = require('../middleware/rateLimiters');
const {
    approve,
    create,
    getAllAppointments,
    getAppointmentById,
    updateAppointmentStatus
} = require('../controllers/appointmentController');

const router = express.Router();

// Public create endpoint (no auth needed)
router.post('/create', create);

// Protected admin/security actions
router.use(protect);

// Staff specific routes (Static must come before dynamic /:id)
router.get('/staff', authorizeRoles('staff', 'admin'), require('../controllers/appointmentController').getStaffAppointments);
router.get('/my-requests', require('../controllers/appointmentController').getMyRequests);
router.post('/book', require('../controllers/appointmentController').bookAppointment);

// Someone Else booking endpoint
router.post('/book-someone-else', (req, res, next) => {
    console.log('🔗 /book-someone-else route hit');
    console.log('👤 User:', req.user ? { id: req.user._id, name: req.user.name } : 'No user');
    next();
}, require('../controllers/appointmentController').bookSomeoneElse);

// NEW: Dashboard Stats endpoint (must come before /stats as it's more specific)
router.get('/dashboard/staff-stats', authorizeRoles('staff', 'admin'), require('../controllers/appointmentController').getStaffDashboardStats);

router.get('/stats', authorizeRoles('staff', 'admin'), require('../controllers/appointmentController').getStats);
router.post('/grant', authorizeRoles('staff', 'admin'), require('../controllers/appointmentController').grantAppointment);

// NEW: Bulk operations (Admin only - must come before /:id routes)
router.post('/bulk-action', authorizeRoles('admin'), require('../controllers/appointmentController').bulkActionAppointments);

// Admin/Guard routes - Get all appointments
router.get('/', authorizeRoles('admin', 'guard'), getAllAppointments);

// Protected admin/security actions (Dynamic routes last)
router.get('/:id', authorizeRoles('admin', 'guard', 'staff'), getAppointmentById);
router.get('/:id/logs', authorizeRoles('admin', 'staff'), require('../controllers/appointmentController').getAppointmentLogs);
router.post('/:id/approve', authorizeRoles('admin', 'security', 'staff'), approve);
router.post('/:id/reject', authorizeRoles('admin', 'staff'), require('../controllers/appointmentController').rejectAppointment);
router.patch('/:id/reschedule', authorizeRoles('admin', 'staff'), require('../controllers/appointmentController').rescheduleAppointment);
router.post('/:id/otp/regenerate', authorizeRoles('admin'), require('../controllers/appointmentController').regenerateOTP);
router.post('/:id/otp/resend', authorizeRoles('admin', 'staff'), otpResendLimiter, require('../controllers/appointmentController').resendOTP);
router.patch('/:id/status', authorizeRoles('admin', 'staff'), updateAppointmentStatus);

module.exports = router;


