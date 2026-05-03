const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    verifyEntry,
    verifyExit,
    searchVisitor
} = require('../controllers/guardController');

const router = express.Router();

// All routes require Guard or Admin role
router.use(protect);
router.use(authorizeRoles('guard', 'admin', 'security'));

router.post('/verify-entry', verifyEntry);
router.post('/verify-exit', verifyExit);
router.get('/search', searchVisitor);

module.exports = router;
