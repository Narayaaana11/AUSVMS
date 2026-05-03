const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getAllIntegrations,
    getIntegrationById,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    testIntegration,
} = require('../controllers/integrationController');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

// Get all integrations
router.get('/', getAllIntegrations);

// Get single integration
router.get('/:id', getIntegrationById);

// Create integration
router.post('/', createIntegration);

// Test integration
router.post('/:id/test', testIntegration);

// Update integration
router.patch('/:id', updateIntegration);

// Delete integration
router.delete('/:id', deleteIntegration);

module.exports = router;
