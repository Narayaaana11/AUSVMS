const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema(
  {
    // Booking Mode: whether this was booked by visitor themselves or by staff for someone else
    bookingMode: {
      type: String,
      enum: ['MYSELF', 'SOMEONE_ELSE'],
      default: 'MYSELF'
    },

    // Requester Information
    requesterType: {
      type: String,
      enum: ['VISITOR', 'STAFF'],
      default: 'VISITOR'
    },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If requesterType is STAFF
    requesterName: { type: String }, // Name of the person who created this request

    name: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    purposeOfVisit: { type: String, required: true },
    personToMeet: { type: String, required: true },
    // Staff reference for proper identification (in addition to personToMeet name)
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Department reference for filtering and reporting
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    department: { type: String },
    photoUrl: { type: String },
    visitorPassId: { type: String, unique: true },
    status: {
      type: String,
      enum: ['created', 'pending', 'approved', 'rejected', 'rescheduled', 'checked-in', 'checked-out', 'cancelled', 'completed'],
      default: 'pending'
    },
    attendees: [{
      name: { type: String },
      phone: { type: String }
    }],
    // Number of additional people accompanying the visitor (0-5)
    additionalAttendees: { type: Number, default: 0, min: 0, max: 5 },
    // Preferred/requested date and time
    dateOfVisit: { type: Date },
    timeOfVisit: { type: String },
    // Scheduled start and end times (ISO datetime) - set after approval
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },
    // Rejection reason (required when status is 'rejected')
    rejectionReason: { type: String, trim: true },

    // Approval Information
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who approved this appointment
    approvedAt: { type: Date }, // When it was approved

    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    otpRef: { type: mongoose.Schema.Types.ObjectId, ref: 'OTP' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Internal notes for admin/staff use
    notes: { type: String, trim: true },
    // Meta data for system use (e.g., seeding, external refs)
    meta: { type: Map, of: String },
    // OTP Security
    otpHash: { type: String, select: false }, // Store hashed OTP only, do not select by default
    otpExpiresAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    maxOtpAttempts: { type: Number, default: 5 },

    // IP address for audit trail
    createdByIp: { type: String },
  },
  { timestamps: true }
);

// Indexes for better query performance
VisitorSchema.index({ staffId: 1, status: 1 });
VisitorSchema.index({ status: 1, createdAt: -1 });
VisitorSchema.index({ contactNumber: 1 });
VisitorSchema.index({ dateOfVisit: 1 });
VisitorSchema.index({ departmentId: 1, status: 1 });

module.exports = mongoose.model('Visitor', VisitorSchema);


