const express = require('express');
const { getConfig, updateConfig, getAllConfigs } = require('../controllers/systemConfigController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin')); // Only admins can manage system config

router.get('/', getAllConfigs);
router.get('/:key', getConfig);
router.put('/:key', updateConfig);

module.exports = router;
