const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getAllTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getMyNotifications,
    markRead,
    markAllRead
} = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

// === USER NOTIFICATIONS (All users) ===
router.get('/', getMyNotifications);
router.patch('/mark-all-read', markAllRead);
router.patch('/:id/read', markRead);

// === TEMPLATES (Admin only) ===
// Frontend apiService needs to be updated to point to /notifications/templates for these
// OR we can keep admin routes on specific paths if we change frontend.
// Given check of apiService, it uses /notifications for templates.
// CHANGE: We will migrate templates to /templates sub-route here, AND update frontend.

router.get('/templates', authorizeRoles('admin'), getAllTemplates);
router.get('/templates/:id', authorizeRoles('admin'), getTemplateById);
router.post('/templates', authorizeRoles('admin'), createTemplate);
router.patch('/templates/:id', authorizeRoles('admin'), updateTemplate);
router.delete('/templates/:id', authorizeRoles('admin'), deleteTemplate);

module.exports = router;
