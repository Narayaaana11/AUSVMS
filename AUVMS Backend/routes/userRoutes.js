const express = require('express');
const { createUser, listUsers, deleteUser, updateUser, toggleActive, resetPassword, getUserProfile, listStaffPublic, updateUserProfile, changePassword } = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Public staff listing for appointment booking
router.get('/staff', listStaffPublic);

// Get current user profile (protected but available to all authenticated users)
router.get('/me', protect, getUserProfile);

// Update own profile (for any authenticated user)
router.patch('/profile', protect, updateUserProfile);

// Change password (for any authenticated user)
router.post('/change-password', protect, changePassword);

router.use(protect);
router.use(authorizeRoles('admin'));

router.post('/create', createUser);
router.get('/', listUsers);
router.delete('/:id', deleteUser);
router.patch('/:id', updateUser);
router.patch('/:id/toggle-active', toggleActive);
router.post('/:id/reset-password', resetPassword);

module.exports = router;


