const mongoose = require('mongoose');

const AttendeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const AppointmentSchema = new mongoose.Schema(
  {
    // Visitor Information
    visitorName: { type: String, required: true, trim: true },
    visitorEmail: { type: String, required: true, lowercase: true, trim: true },
    visitorPhone: { type: String, required: true, trim: true },

    // Staff/Department Information
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staffName: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    personToMeet: { type: String, required: true, trim: true }, // Backward compatibility

    // Appointment Details
    purpose: { type: String, required: true, trim: true },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true, trim: true },

    // Status Management
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESCHEDULED', 'IN', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      uppercase: true
    },

    // OTP Management
    otpHash: { type: String },
    otpStatus: {
      type: String,
      enum: ['OK', 'EXPIRED', 'LOCKED', 'NOT_GENERATED'],
      default: 'NOT_GENERATED'
    },
    otpExpiresAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    otpRef: { type: mongoose.Schema.Types.ObjectId, ref: 'OTP' }, // Backward compatibility

    // Scheduling
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },

    // Audit Trail
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Additional Fields
    attendees: { type: [AttendeeSchema], default: [] },
    notes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    rescheduleReason: { type: String, trim: true },

    // Metadata
    meta: {
      seededBy: { type: String },
      checkInTime: { type: Date },
      checkOutTime: { type: Date },
      actualDuration: { type: Number }, // in minutes
      ipAddress: { type: String }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
AppointmentSchema.index({ createdAt: -1 });
AppointmentSchema.index({ updatedAt: -1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ staffId: 1, status: 1 });
AppointmentSchema.index({ departmentId: 1, status: 1 });
AppointmentSchema.index({ preferredDate: 1 });
AppointmentSchema.index({ personToMeet: 1, status: 1 });
AppointmentSchema.index({ visitorEmail: 1 });
AppointmentSchema.index({ visitorPhone: 1 });

// Text index for search
AppointmentSchema.index({
  visitorName: 'text',
  visitorEmail: 'text',
  visitorPhone: 'text',
  purpose: 'text'
});

// Virtual for appointment ID display
AppointmentSchema.virtual('appointmentId').get(function () {
  return `APT-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Method to check if appointment can be modified
AppointmentSchema.methods.canBeModified = function () {
  return ['PENDING', 'RESCHEDULED'].includes(this.status);
};

// Method to check if OTP is valid
AppointmentSchema.methods.isOtpValid = function () {
  return this.otpStatus === 'OK' &&
    this.otpExpiresAt &&
    new Date() < this.otpExpiresAt &&
    this.otpAttempts < 3;
};

module.exports = mongoose.model('Appointment', AppointmentSchema);


