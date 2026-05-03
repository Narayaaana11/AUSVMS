const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getAllHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getUpcomingHolidays,
} = require('../controllers/holidayController');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

// Get all holidays
router.get('/', getAllHolidays);

// Get upcoming holidays
router.get('/upcoming', getUpcomingHolidays);

// Get single holiday
router.get('/:id', getHolidayById);

// Create holiday
router.post('/', createHoliday);

// Update holiday
router.patch('/:id', updateHoliday);

// Delete holiday
router.delete('/:id', deleteHoliday);

module.exports = router;
