const express = require('express');
const router = express.Router();
const emailSmsController = require('../controllers/emailSmsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// ============= CONFIGURATION (Admin Only) =============

router.get('/config', authorizeRoles('admin'), emailSmsController.getConfig);
router.put('/config', authorizeRoles('admin'), emailSmsController.saveConfig);
router.post('/test-email', authorizeRoles('admin'), emailSmsController.sendTestEmail);
router.post('/verify-smtp', authorizeRoles('admin'), emailSmsController.verifySmtp);

// ============= TEMPLATES (Admin Only) =============

router.get('/email-templates', authorizeRoles('admin'), emailSmsController.getTemplates);
router.post('/email-templates', authorizeRoles('admin'), emailSmsController.createEmailTemplate);
router.put('/email-templates/:name', authorizeRoles('admin'), emailSmsController.updateEmailTemplate);
router.patch('/email-templates/:name/enable', authorizeRoles('admin'), emailSmsController.toggleEmailTemplate);
router.post('/email-templates/:name/preview', authorizeRoles('admin'), emailSmsController.previewEmailTemplate);

// ============= SENDING (Admin + Server-to-Server) =============

// This endpoint can be called by other services or admin
router.post('/send', emailSmsController.sendNotification);

// ============= LOGS (Admin Only) =============

router.get('/logs', authorizeRoles('admin'), emailSmsController.getLogs);
router.post('/logs/:id/retry', authorizeRoles('admin'), emailSmsController.retryNotification);
router.post('/bulk-retry', authorizeRoles('admin'), emailSmsController.bulkRetry);
router.get('/stats', authorizeRoles('admin'), emailSmsController.getStats);

module.exports = router;
