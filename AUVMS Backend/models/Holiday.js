const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['holiday', 'special-day'],
      default: 'holiday',
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    affectedDepartments: [String],
    affectedLocations: [String],
    appointmentsAllowed: {
      type: Boolean,
      default: false,
    },
    impactLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', HolidaySchema);
