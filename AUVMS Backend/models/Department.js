const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Department name is required'],
            unique: true,
            trim: true,
        },
        code: {
            type: String,
            unique: true,
            sparse: true, // Allows null values while maintaining uniqueness
            trim: true,
            uppercase: true,
        },
        description: {
            type: String,
            trim: true,
        },
        officeLocation: {
            type: String,
            trim: true,
        },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        contactPhone: {
            type: String,
            trim: true,
        },
        activeHours: {
            startTime: {
                type: String, // Format: "09:00"
                default: '09:00',
            },
            endTime: {
                type: String, // Format: "17:00"
                default: '17:00',
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
// Note: name and code already have indexes from unique:true
DepartmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', DepartmentSchema);
