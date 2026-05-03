const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentSummary,
} = require('../controllers/departmentController');

const router = express.Router();

// Public endpoint for listing departments (no visitor counts)
router.get('/list', getAllDepartments);

// All routes below require authentication and admin role
router.use(protect);
router.use(authorizeRoles('admin'));

// Get department summary
router.get('/summary', getDepartmentSummary);

// Get all departments with visitor counts
router.get('/', getAllDepartments);

// Get single department
router.get('/:id', getDepartmentById);

// Create department
router.post('/', createDepartment);

// Update department
router.put('/:id', updateDepartment);

// Soft delete department (deactivate)
router.delete('/:id', deleteDepartment);

module.exports = router;
