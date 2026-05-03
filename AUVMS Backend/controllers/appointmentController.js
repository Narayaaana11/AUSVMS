const createError = require('http-errors');
const bcrypt = require('bcrypt');
const dayjs = require('dayjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment');
const OTP = require('../models/OTP');
const { sendEmail, sendWhatsApp } = require('../utils/notify');
const AuditLog = require('../models/AuditLog');
const AppointmentLog = require('../models/AppointmentLog');
const { getOtpTemplate, getAppointmentReceivedTemplate, getAdminNewRequestTemplate } = require('../utils/emailTemplates');
const { hashOTP } = require('../utils/otp');

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id);
    if (!visitor) return next(createError(404, 'Appointment/visitor not found'));

    // Mark approved
    if (!visitor.checkInAt) {
      visitor.status = 'approved'; // Set to approved
      await visitor.save();
    }

    // Invalidate previous OTPs
    await OTP.updateMany({ appointmentId: visitor._id, used: false }, { $set: { used: true } });

    const otp = generateOTP();
    const codeHash = await bcrypt.hash(otp, 10);
    const otpHash = hashOTP(otp);
    // Remove time limit (set to 1 year approx)
    const ttlMinutes = 525600;
    const expiresAt = dayjs().add(ttlMinutes, 'minute').toDate();
    const record = await OTP.create({ appointmentId: visitor._id, codeHash, expiresAt });
    visitor.otpRef = record._id;
    visitor.otpHash = otpHash;
    visitor.otpExpiresAt = expiresAt;
    await visitor.save();

    const dateStr = dayjs(visitor.createdAt).format('YYYY-MM-DD');
    const timeStr = dayjs(visitor.createdAt).format('HH:mm');
    const text = `Hello ${visitor.name},\nYour appointment with ${visitor.personToMeet} on ${dateStr} at ${timeStr} has been approved.\nYour OTP for campus entry is: ${otp}`;

    // send email
    if (visitor.email) {
      const html = getOtpTemplate(visitor.name, visitor.personToMeet, dateStr, timeStr, otp);
      sendEmail({ to: visitor.email, subject: 'Appointment Approved - Aditya University', html }).catch(() => { });
    }

    // Send WhatsApp notification
    sendWhatsApp({ to: visitor.contactNumber, message: text }).catch(() => { });

    // If this was a staff-to-staff request (visitor is actually a staff member requesting to meet someone)
    // Send approval notification to the requester via WebSocket
    if (visitor.createdBy && global.io) {
      try {
        const User = require('../models/User');
        const requesterUser = await User.findById(visitor.createdBy);

        if (requesterUser) {
          const requesterRoom = `staff:${requesterUser._id.toString()}`;
          logger.info('Emitting appointment_approved to requester room', { requesterRoom });

          global.io.to(requesterRoom).emit('appointment_approved', {
            id: visitor._id,
            visitorName: visitor.name,
            personToMeet: visitor.personToMeet,
            purpose: visitor.purposeOfVisit,
            status: 'approved',
            dateOfVisit: visitor.dateOfVisit,
            timeOfVisit: visitor.timeOfVisit,
            approvedAt: new Date(),
            approvedBy: {
              id: req.user._id,
              name: req.user.name,
              role: req.user.role
            }
          });

          // Also send a notification message
          global.io.to(requesterRoom).emit('notification', {
            type: 'success',
            title: 'Appointment Approved',
            message: `Your appointment with ${visitor.personToMeet} has been approved. You will receive an OTP shortly.`,
            appointmentId: visitor._id
          });
        }
      } catch (err) {
        logger.error('Failed to notify requester via WebSocket', { error: err.message, visitorId: visitor._id });
      }
    }

    // Audit Log (Legacy)
    AuditLog.create({ actorId: req.user?._id, action: 'appointment.approve', resource: String(visitor._id), details: { otpId: String(record._id) } }).catch(() => { });

    // New Activity Log & Realtime Update
    try {
      // Create Log
      await AppointmentLog.create({
        appointmentId: visitor._id,
        action: 'APPROVED',
        performedBy: req.user._id,
        performedByRole: req.user.role,
        metadata: { otpId: String(record._id) }
      });

      // Realtime Updates
      if (global.io && visitor.staffId) {
        const staffRoom = `staff:${visitor.staffId.toString()}`;

        // Emit KPI Update Trigger (Frontend should refetch or increment)
        global.io.to(staffRoom).emit('kpi_update', {
          type: 'appointment_approved',
          appointmentId: visitor._id
        });

        // Emit Recent Activity Feed Item
        global.io.to(staffRoom).emit('recent_activity', {
          id: new Date().getTime().toString(), // Temporary ID or fetch from DB
          type: 'APPROVED',
          title: 'Appointment Approved',
          description: `${visitor.name} - ${visitor.purposeOfVisit}`,
          appointmentId: visitor._id,
          status: 'approved',
          createdAt: new Date(),
          createdBy: {
            id: req.user._id,
            name: req.user.name,
            role: req.user.role
          }
        });
      }
    } catch (logErr) {
      console.error('Failed to log activity or emit socket event', logErr);
    }

    res.json({ success: true, message: 'OTP generated and sent', otpId: record._id });
  } catch (err) {
    next(err);
  }
};


exports.create = async (req, res, next) => {
  try {
    logger.info('Appointment creation initiated', { body: req.body, user: req.user ? { id: req.user._id, name: req.user.name, role: req.user.role } : 'public' });

    const body = req.body || {};

    // Map payload
    let name = body.visitorName || body.name;
    let email = body.visitorEmail || body.email;
    let contactNumber = body.visitorPhone || body.phone;
    let purposeOfVisit = body.purpose || body.purposeOfVisit;
    let personToMeet = body.personToMeet;
    let staffId = body.staffId; // Staff ID reference
    let preferredDate = body.preferredDate;
    let preferredTime = body.preferredTime;

    logger.debug('Parsed appointment data', { name, email, contactNumber, purposeOfVisit, personToMeet, staffId, preferredDate, preferredTime });

    // Validation
    if (!name || !contactNumber || !purposeOfVisit || !personToMeet) {
      return next(createError(400, 'Missing required fields: name, phone, purpose, and person to meet are required'));
    }

    // Validate phone number (10 digits)
    if (!/^[0-9]{10}$/.test(contactNumber)) {
      return next(createError(400, 'Phone number must be exactly 10 digits'));
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(createError(400, 'Invalid email format'));
    }

    // Validate date is today or future
    if (preferredDate) {
      const dateObj = new Date(preferredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dateObj < today) {
        return next(createError(400, 'Preferred date must be today or in the future'));
      }
    }

    let attendees = body.attendees || [];
    let additionalAttendees = body.additionalAttendees || 0;

    // Validate attendees if present
    if (!Array.isArray(attendees)) {
      attendees = [];
    }

    // If additionalAttendees is not provided but attendees array exists, use array length
    if (!additionalAttendees && attendees.length > 0) {
      additionalAttendees = attendees.length;
    }

    // Generate ID
    const visitorPassId = require('../utils/generateVisitorID')();

    // Get client IP for audit trail
    const createdByIp = req.ip || req.connection?.remoteAddress || 'unknown';

    // If staffId is provided, verify it exists and get staff name
    let resolvedStaffId = null;
    const User = require('../models/User');

    if (staffId) {
      logger.debug('Looking up staff by ID', { staffId });
      const staffUser = await User.findById(staffId);
      if (staffUser) {
        resolvedStaffId = staffUser._id;
        logger.debug('Staff found by ID', { id: staffUser._id, name: staffUser.name });
        // Use staff's actual name if not already set
        if (!personToMeet || personToMeet === staffId) {
          personToMeet = staffUser.name;
        }
      } else {
        logger.warn('Staff not found by ID', { staffId });
      }
    } else if (personToMeet) {
      logger.debug('Looking up staff by name', { personToMeet });
      // If staffId not provided but personToMeet is, try to find the staff member
      // Try exact match first, then partial match
      let staffUser = await User.findOne({
        $or: [
          { name: { $regex: new RegExp('^' + personToMeet + '$', 'i') } },
          { username: { $regex: new RegExp('^' + personToMeet + '$', 'i') } }
        ]
      });

      // If no exact match, try partial match (in case personToMeet is a longer string)
      if (!staffUser) {
        staffUser = await User.findOne({
          $or: [
            { name: { $regex: personToMeet.split(',')[0].trim(), $options: 'i' } },
            { username: { $regex: personToMeet.split(',')[0].trim(), $options: 'i' } }
          ]
        });
      }

      if (staffUser) {
        resolvedStaffId = staffUser._id;
        logger.debug('Staff found by name', { id: staffUser._id, name: staffUser.name });
      } else {
        logger.warn('Staff not found by name', { personToMeet });
      }
    }

    logger.debug('Final resolved staffId', { resolvedStaffId });

    // Create Visitor record
    const visitor = await Visitor.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      contactNumber,
      purposeOfVisit,
      personToMeet,
      staffId: resolvedStaffId,
      visitorPassId,
      status: 'pending',
      attendees: attendees,
      additionalAttendees,
      dateOfVisit: preferredDate ? new Date(preferredDate) : undefined,
      timeOfVisit: preferredTime,
      createdByIp,
    });

    logger.info('Visitor record created', { id: visitor._id, name: visitor.name, staffId: visitor.staffId, status: visitor.status });

    // Format date and time for emails
    const dateStr = visitor.dateOfVisit
      ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
      : dayjs(visitor.createdAt).format('YYYY-MM-DD');
    const timeStr = visitor.timeOfVisit || dayjs(visitor.createdAt).format('HH:mm');

    // 1. Notification to Visitor (Email)
    if (visitor.email) {
      const subject = 'Appointment Received - Aditya University';
      const html = getAppointmentReceivedTemplate(
        visitor.name,
        visitor.personToMeet,
        visitor.purposeOfVisit,
        visitor.visitorPassId,
        dateStr,
        timeStr
      );
      sendEmail({ to: visitor.email, subject, html }).catch(() => { });
    }

    // 2. Notify Admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('email');
      if (admins.length > 0) {
        const adminEmails = admins.map(a => a.email).filter(Boolean);
        if (adminEmails.length > 0) {
          const adminSubject = 'New Appointment Request';
          const adminHtml = getAdminNewRequestTemplate(visitor.name, visitor.contactNumber, visitor.personToMeet, visitor.purposeOfVisit);

          adminEmails.forEach(email => {
            sendEmail({ to: email, subject: adminSubject, html: adminHtml }).catch(() => { });
          });
        }
      }
    } catch (e) {
      logger.error('Failed to notify admins about new appointment', { error: e.message, visitorId: visitor._id });
    }

    // 3. Notify Staff Member
    try {
      const User = require('../models/User');
      let staffUser = null;

      // If staffId is provided, use it directly
      if (resolvedStaffId) {
        staffUser = await User.findById(resolvedStaffId);
      } else {
        // Fallback to name-based matching
        staffUser = await User.findOne({
          $or: [
            { name: { $regex: new RegExp('^' + personToMeet + '$', 'i') } },
            { username: { $regex: new RegExp('^' + personToMeet + '$', 'i') } }
          ]
        });

        // Update visitor with found staffId
        if (staffUser) {
          visitor.staffId = staffUser._id;
          await visitor.save();
        }
      }

      if (staffUser && staffUser.email) {
        const { getStaffNewRequestTemplate } = require('../utils/emailTemplates');
        const staffHtml = getStaffNewRequestTemplate(
          visitor.name,
          visitor.contactNumber,
          visitor.purposeOfVisit,
          dateStr,
          timeStr
        );
        sendEmail({
          to: staffUser.email,
          subject: 'New Appointment Request - Aditya University',
          html: staffHtml
        }).catch(() => { });
      }
    } catch (e) {
      logger.error('Failed to notify staff about new appointment', { error: e.message, visitorId: visitor._id });
    }

    AuditLog.create({ actorId: req.user?._id, action: 'appointment.create', resource: String(visitor._id) }).catch(() => { });

    // Emit WebSocket event for new appointment
    if (global.io) {
      global.io.emit('new_appointment', {
        id: visitor._id,
        visitorName: visitor.name,
        personToMeet: visitor.personToMeet,
        purpose: visitor.purposeOfVisit,
        status: visitor.status,
        dateOfVisit: visitor.dateOfVisit,
        timeOfVisit: visitor.timeOfVisit,
        createdAt: visitor.createdAt
      });
    }

    return res.status(201).json({ id: visitor._id, status: visitor.status, success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * Book appointment for someone else (Staff creates pre-approved appointment)
 * Mode: SOMEONE_ELSE - Auto-approved appointment
 * Only authenticated staff can use this
 */
exports.bookSomeoneElse = async (req, res, next) => {
  try {
    // Ensure user is authenticated (staff)
    if (!req.user) {
      return next(createError(401, 'Authentication required'));
    }

    logger.info('Book appointment for someone else initiated', { userId: req.user._id, userName: req.user.name, userRole: req.user.role, body: req.body });

    const body = req.body || {};

    // Map payload
    let visitorName = body.visitorName || body.name;
    let visitorEmail = body.visitorEmail || body.email;
    let visitorPhone = body.visitorPhone || body.phone;
    let purpose = body.purpose || body.purposeOfVisit;
    let preferredDate = body.preferredDate;
    let preferredTime = body.preferredTime;
    let attendees = body.attendees || [];
    let additionalAttendees = body.additionalAttendees || 0;

    logger.debug('Parsed booking data', { visitorName, visitorEmail, visitorPhone, purpose, preferredDate, preferredTime });

    // Validation
    if (!visitorName || !visitorPhone || !purpose) {
      return next(createError(400, 'Missing required fields: visitor name, phone, and purpose are required'));
    }

    // Validate phone number (10 digits)
    if (!/^[0-9]{10}$/.test(visitorPhone)) {
      return next(createError(400, 'Phone number must be exactly 10 digits'));
    }

    // Validate email if provided
    if (visitorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
      return next(createError(400, 'Invalid email format'));
    }

    // Validate date is today or future
    if (preferredDate) {
      const dateObj = new Date(preferredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dateObj < today) {
        return next(createError(400, 'Preferred date must be today or in the future'));
      }
    }

    // Validate attendees if present
    if (!Array.isArray(attendees)) {
      attendees = [];
    }

    if (!additionalAttendees && attendees.length > 0) {
      additionalAttendees = attendees.length;
    }

    // Generate visitor pass ID
    const visitorPassId = require('../utils/generateVisitorID')();
    const createdByIp = req.ip || req.connection?.remoteAddress || 'unknown';

    // Create OTP for auto-approved appointment
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const ttlMinutes = 1440; // 24 hours (1 day)
    const otpExpiresAt = dayjs().add(ttlMinutes, 'minute').toDate();

    // Create visitor record with SOMEONE_ELSE booking mode
    const visitor = await Visitor.create({
      // Booking Mode Information
      bookingMode: 'SOMEONE_ELSE',
      requesterType: 'STAFF',
      requesterId: req.user._id,
      requesterName: req.user.name,

      // Visitor Information
      name: visitorName,
      email: visitorEmail ? visitorEmail.toLowerCase() : undefined,
      contactNumber: visitorPhone,
      purposeOfVisit: purpose,
      personToMeet: req.user.name, // Person to meet is the logged-in user
      staffId: req.user._id, // The logged-in staff member
      visitorPassId,

      // Appointment Details
      dateOfVisit: preferredDate ? new Date(preferredDate) : undefined,
      timeOfVisit: preferredTime,
      attendees,
      additionalAttendees,

      // Auto-Approval (Someone Else mode is pre-approved)
      status: 'approved',
      approvedBy: req.user._id,
      approvedAt: new Date(),

      // OTP Information
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,

      createdBy: req.user._id,
      createdByIp,
    });

    logger.info('Visitor created in SOMEONE_ELSE mode', {
      id: visitor._id,
      name: visitor.name,
      staffId: visitor.staffId,
      status: visitor.status,
      bookingMode: visitor.bookingMode,
      createdAt: visitor.createdAt
    });

    // Log the full visitor object for debugging
    console.log('📊 Full visitor object:', JSON.stringify({
      _id: visitor._id,
      name: visitor.name,
      email: visitor.email,
      contactNumber: visitor.contactNumber,
      staffId: visitor.staffId,
      status: visitor.status,
      bookingMode: visitor.bookingMode,
      requesterType: visitor.requesterType,
      requesterId: visitor.requesterId,
      approvedBy: visitor.approvedBy,
      approvedAt: visitor.approvedAt
    }, null, 2));

    // Format date and time for emails
    const dateStr = visitor.dateOfVisit
      ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
      : dayjs(visitor.createdAt).format('YYYY-MM-DD');
    const timeStr = visitor.timeOfVisit || dayjs(visitor.createdAt).format('HH:mm');

    // 1. Send OTP to Visitor via Email
    if (visitor.email) {
      const subject = 'Appointment Confirmed - Aditya University';
      const html = getOtpTemplate(
        visitor.name,
        visitor.personToMeet,
        dateStr,
        timeStr,
        otp
      );
      sendEmail({ to: visitor.email, subject, html }).catch(() => { });
      logger.info('OTP email sent to visitor', { visitorId: visitor._id, visitorEmail: visitor.email });
    }

    // 2. Send OTP to Visitor via WhatsApp (if available)
    try {
      const text = `Hello ${visitor.name},\nYour appointment with ${visitor.personToMeet} on ${dateStr} at ${timeStr} is confirmed.\nYour OTP for campus entry is: ${otp}`;
      sendWhatsApp({ to: visitor.contactNumber, message: text }).catch(() => { });
      logger.info('OTP WhatsApp sent to visitor', { visitorId: visitor._id, phone: visitor.contactNumber });
    } catch (e) {
      logger.error('Failed to send WhatsApp', { error: e.message, visitorId: visitor._id });
    }

    // 3. Create Audit Log
    AuditLog.create({
      actorId: req.user._id,
      action: 'appointment.bookSomeoneElse',
      resource: String(visitor._id),
      details: { bookingMode: 'SOMEONE_ELSE', visitorName }
    }).catch(() => { });

    // 4. Emit WebSocket event for real-time update
    if (global.io) {
      // Broadcast to all connected users (not just specific room)
      global.io.emit('appointment_created', {
        appointmentId: visitor._id,
        visitorName: visitor.name,
        personToMeet: visitor.personToMeet,
        purpose: visitor.purposeOfVisit,
        status: visitor.status,
        bookingMode: visitor.bookingMode,
        dateOfVisit: visitor.dateOfVisit,
        timeOfVisit: visitor.timeOfVisit,
        createdAt: visitor.createdAt,
        isAutoApproved: true,
        staffId: visitor.staffId
      });

      logger.info('WebSocket appointment_created event broadcasted', { appointmentId: visitor._id });
    } else {
      logger.warn('WebSocket not available for appointment broadcast', { appointmentId: visitor._id });
    }

    return res.status(201).json({
      success: true,
      id: visitor._id,
      status: visitor.status,
      message: 'Appointment created and auto-approved',
      appointmentId: `APT-${visitor._id.toString().slice(-8).toUpperCase()}`,
      otpSent: !!visitor.email
    });
  } catch (err) {
    logger.error('Error in bookSomeoneElse', { error: err.message, userId: req.user?._id });
    next(err);
  }
};

exports.getStaffAppointments = async (req, res, next) => {
  try {
    logger.debug('Fetching staff appointments', { userId: req.user._id, userName: req.user.name, userRole: req.user.role, queryParams: req.query });

    const Visitor = require('../models/Visitor');
    const { status, q } = req.query;

    // Use staffId for accurate matching
    const query = { staffId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { contactNumber: { $regex: q, $options: 'i' } }
      ];
    }

    logger.debug('Executing visitor query', { query: JSON.stringify(query) });

    const visitors = await Visitor.find(query).sort({ createdAt: -1 });
    logger.debug('Visitors found', { count: visitors.length });
    if (visitors.length > 0) {
      logger.debug('First visitor details', { id: visitors[0]._id, name: visitors[0].name, staffId: visitors[0].staffId, status: visitors[0].status });
    }
    res.json({ appointments: visitors, totalCount: visitors.length });
  } catch (err) {
    next(err);
  }
};

exports.bookAppointment = async (req, res, next) => {
  try {
    logger.info('Book appointment initiated (staff-to-staff)', { userId: req.user._id, userName: req.user.name, userRole: req.user.role, body: req.body });

    const Visitor = require('../models/Visitor');
    const User = require('../models/User');
    const { personToMeet, purpose, preferredDate, preferredTime, notes, attendees, additionalAttendees, staffId: providedStaffId } = req.body;

    // Validation
    if (!personToMeet || !purpose || !preferredDate || !preferredTime) {
      return next(createError(400, 'Missing required fields: personToMeet, purpose, preferredDate, and preferredTime are required'));
    }

    // Validate date is today or future
    if (preferredDate) {
      const dateObj = new Date(preferredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dateObj < today) {
        return next(createError(400, 'Preferred date must be today or in the future'));
      }
    }

    const visitorPassId = require('../utils/generateVisitorID')();

    // Find the staff member - prioritize staffId from frontend, fallback to name lookup
    let staffId = null;
    let targetStaff = null;

    // First try: use staffId if provided from frontend
    if (providedStaffId) {
      logger.debug('Looking up target staff by ID', { providedStaffId });
      targetStaff = await User.findById(providedStaffId);
      if (targetStaff) {
        staffId = targetStaff._id;
        logger.debug('Target staff found by ID', { id: targetStaff._id, name: targetStaff.name, email: targetStaff.email });
      } else {
        logger.warn('Target staff not found by ID', { providedStaffId });
      }
    }

    // Fallback: if not found by ID, try name lookup
    if (!targetStaff && personToMeet) {
      logger.debug('Looking up target staff by name', { personToMeet });
      targetStaff = await User.findOne({
        $or: [
          { name: { $regex: new RegExp('^' + personToMeet + '$', 'i') } },
          { username: { $regex: new RegExp('^' + personToMeet + '$', 'i') } }
        ]
      });
      if (targetStaff) {
        staffId = targetStaff._id;
        logger.debug('Target staff found by name', { id: targetStaff._id, name: targetStaff.name, email: targetStaff.email });
      } else {
        logger.warn('Target staff not found by name', { personToMeet });
      }
    }

    // Create appointment
    const appointment = await Visitor.create({
      name: req.user.name,
      email: req.user.email,
      contactNumber: req.user.phone || req.user.contactNumber || 'N/A',
      purposeOfVisit: purpose,
      personToMeet: personToMeet,
      staffId: staffId,
      visitorPassId,
      status: 'pending',
      createdBy: req.user._id,
      // Mark as STAFF appointment since requester is a staff member
      requesterType: 'STAFF',
      requesterId: req.user._id,
      requesterName: req.user.name,
      dateOfVisit: preferredDate ? new Date(preferredDate) : undefined,
      timeOfVisit: preferredTime,
      attendees: attendees || [],
      additionalAttendees: additionalAttendees || 0,
      notes: notes || '',
    });

    logger.info('Appointment created for staff-to-staff request', { id: appointment._id, requesterName: appointment.name, requesterStaffId: appointment.staffId, status: appointment.status });

    // Format date and time for emails
    const dateStr = appointment.dateOfVisit
      ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD');
    const timeStr = appointment.timeOfVisit || dayjs().format('HH:mm');

    // 1. Send confirmation email to requester (staff member)
    if (req.user.email) {
      const { getAppointmentReceivedTemplate } = require('../utils/emailTemplates');
      const subject = 'Appointment Request Submitted - Aditya University';
      const html = getAppointmentReceivedTemplate(
        req.user.name,
        personToMeet,
        purpose,
        visitorPassId,
        dateStr,
        timeStr
      );
      sendEmail({ to: req.user.email, subject, html }).catch(err => {
        logger.error('Failed to send confirmation email to requester', { error: err.message, userId: req.user._id });
      });
    }

    // 2. Notify target staff member about incoming request
    if (targetStaff && targetStaff.email) {
      const { getStaffNewRequestTemplate } = require('../utils/emailTemplates');
      const staffHtml = getStaffNewRequestTemplate(
        req.user.name,
        req.user.phone || req.user.contactNumber || 'N/A',
        purpose,
        dateStr,
        timeStr
      );
      sendEmail({
        to: targetStaff.email,
        subject: 'New Appointment Request - Aditya University',
        html: staffHtml
      }).catch(err => {
        logger.error('Failed to send notification email to target staff', { error: err.message, staffId: targetStaff._id });
      });

      // 3. Emit WebSocket event to target staff's room
      if (global.io) {
        const targetStaffRoom = `staff:${staffId.toString()}`;
        logger.info('Emitting incoming_request event to staff', { room: targetStaffRoom, staffId, appointmentId: appointment._id });

        global.io.to(targetStaffRoom).emit('incoming_request', {
          id: appointment._id,
          visitorName: req.user.name,
          visitorEmail: req.user.email,
          visitorPhone: req.user.phone || req.user.contactNumber || 'N/A',
          purpose: purpose,
          status: 'pending',
          dateOfVisit: appointment.dateOfVisit,
          timeOfVisit: appointment.timeOfVisit,
          createdAt: appointment.createdAt,
          staffId: staffId,
          personToMeet: personToMeet,
        });
      }
    }

    // Audit log
    AuditLog.create({
      actorId: req.user._id,
      action: 'appointment.book',
      resource: String(appointment._id),
      details: { targetStaffId: staffId, targetStaffName: personToMeet }
    }).catch(() => { });

    res.status(201).json({ success: true, appointmentId: appointment._id, id: appointment._id });
  } catch (err) {
    next(err);
  }
};

exports.grantAppointment = async (req, res, next) => {
  try {
    const Visitor = require('../models/Visitor');
    const User = require('../models/User');
    const OTP = require('../models/OTP');
    const crypto = require('crypto');
    const bcrypt = require('bcrypt');
    const dayjs = require('dayjs');

    const { visitorName, visitorEmail, visitorPhone, purpose, meetingPerson, date, time } = req.body;

    const visitorPassId = require('../utils/generateVisitorID')();

    // Find the staff member by name to get their ID
    let staffId = null;
    if (meetingPerson) {
      const staffUser = await User.findOne({
        $or: [
          { name: { $regex: new RegExp('^' + meetingPerson + '$', 'i') } },
          { username: { $regex: new RegExp('^' + meetingPerson + '$', 'i') } }
        ]
      });
      if (staffUser) {
        staffId = staffUser._id;
      }
    }

    const visitor = await Visitor.create({
      name: visitorName,
      email: visitorEmail,
      contactNumber: visitorPhone,
      personToMeet: meetingPerson || req.user.name,
      staffId: staffId,
      visitorPassId,
      status: 'approved',
      createdBy: req.user._id,
      purposeOfVisit: `${purpose} (Scheduled: ${date} ${time})`
    });

    const otpVal = String(crypto.randomInt(100000, 999999));
    const codeHash = await bcrypt.hash(otpVal, 10);
    const otpHash = hashOTP(otpVal);
    const expiresAt = dayjs().add(24, 'hours').toDate();

    const otpRecord = await OTP.create({ appointmentId: visitor._id, codeHash, expiresAt });
    visitor.otpRef = otpRecord._id;
    visitor.otpHash = otpHash;
    visitor.otpExpiresAt = expiresAt;
    visitor.otpAttempts = 0;
    await visitor.save();

    res.status(201).json({ success: true, otp: otpVal });
  } catch (err) {
    next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const Visitor = require('../models/Visitor');
    const appointments = await Visitor.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const { getAppointmentStats } = require('../services/appointmentService');
    const dayjs = require('dayjs');

    const filters = { ...req.query };

    // If NOT admin, force restrict to own stats
    if (req.user.role !== 'admin') {
      filters.staffId = req.user._id;
    }

    // Call service
    const stats = await getAppointmentStats(filters);

    // Legacy support: calculate todayTotal manually or add to service if needed
    // For now, we'll just return the service stats plus todayTotal query if needed
    // But since the frontend expects specific keys, we simply send what the service returns
    // The service returns { total, pending, approved, rejected, completed, rescheduled, cancelled }
    // which covers the Admin Panel requirements.

    res.json(stats);

  } catch (err) {
    next(err);
  }
};

// Get all appointments (Admin/Guard only)
exports.getAllAppointments = async (req, res, next) => {
  try {
    const Visitor = require('../models/Visitor');
    const { status, staffId, date, fromDate, toDate, search, page = 1, pageSize = 50 } = req.query;

    let query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by staffId
    if (staffId) {
      query.staffId = staffId;
    }

    // Filter by date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    // Filter by date range
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Filter by department
    if (req.query.department && req.query.department !== 'all') {
      query.department = req.query.department;
    }

    // Filter by OTP Status
    // OK = Not Expired AND Attempts < Max
    // EXPIRED = Expired
    // LOCKED = Attempts >= Max
    if (req.query.otpStatus) {
      const now = new Date();
      const status = req.query.otpStatus;

      if (status === 'OK') {
        query.otpExpiresAt = { $gt: now };
        query.status = { $in: ['approved', 'expected'] };
        // We usually check attempts < maxOtpAttempts, but maxOtpAttempts is a field in doc.
        // In Mongo, comparing two fields requires $expr or aggregation.
        // For simplicity, we assume default 5 or check if otpAttempts < 5 explicitly if we can't use $expr easily in basic find
        // query.$expr = { $lt: ["$otpAttempts", "$maxOtpAttempts"] }; // This works
        query.$expr = { $lt: ["$otpAttempts", { $ifNull: ["$maxOtpAttempts", 5] }] };
      } else if (status === 'EXPIRED') {
        query.otpExpiresAt = { $lte: now };
      } else if (status === 'LOCKED') {
        query.$expr = { $gte: ["$otpAttempts", { $ifNull: ["$maxOtpAttempts", 5] }] };
      }
    }

    // Search by visitor name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [appointments, total] = await Promise.all([
      Visitor.find(query)
        .populate('staffId', 'name email department designation')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(pageSize)),
      Visitor.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get appointment by ID (role-based access)
exports.getAppointmentById = async (req, res, next) => {
  try {
    const Visitor = require('../models/Visitor');
    const { id } = req.params;

    const appointment = await Visitor.findById(id).populate('staffId', 'name email department designation');

    if (!appointment) {
      return next(createError(404, 'Appointment not found'));
    }

    // Role-based access control
    const userRole = req.user.role;
    if (userRole === 'staff') {
      // Staff can only view their own appointments
      if (appointment.staffId && appointment.staffId._id.toString() !== req.user._id.toString()) {
        return next(createError(403, 'You can only view your own appointments'));
      }
    }
    // Admin and guard can view all appointments

    res.json({
      success: true,
      data: appointment
    });
  } catch (err) {
    next(err);
  }
};

// Update appointment status (Admin/Staff)
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const Visitor = require('../models/Visitor');
    const { id } = req.params;
    const { status, message } = req.body;

    // Validate status
    const validStatuses = ['approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return next(createError(400, 'Invalid status. Must be one of: approved, rejected, cancelled'));
    }

    const appointment = await Visitor.findById(id).populate('staffId', 'name email');

    if (!appointment) {
      return next(createError(404, 'Appointment not found'));
    }

    // Role-based access control
    const userRole = req.user.role;
    if (userRole === 'staff') {
      // Staff can only update their own appointments
      if (appointment.staffId && appointment.staffId._id.toString() !== req.user._id.toString()) {
        return next(createError(403, 'You can only update your own appointments'));
      }
    }
    // Admin can update any appointment

    // Update status
    const oldStatus = appointment.status;
    appointment.status = status;

    // Add note if message provided
    if (message) {
      const noteText = `[${new Date().toISOString()}] Status changed from ${oldStatus} to ${status} by ${req.user.name}: ${message}`;
      appointment.notes = appointment.notes ? `${appointment.notes}\n${noteText}` : noteText;
    }

    await appointment.save();

    // Send email notification to visitor
    if (appointment.email) {
      const { getAppointmentStatusChangeTemplate } = require('../utils/emailTemplates');
      const dateStr = appointment.dateOfVisit
        ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
        : dayjs(appointment.createdAt).format('YYYY-MM-DD');
      const timeStr = appointment.timeOfVisit || dayjs(appointment.createdAt).format('HH:mm');

      const html = getAppointmentStatusChangeTemplate(
        appointment.name,
        appointment.personToMeet,
        dateStr,
        timeStr,
        status,
        message
      );

      sendEmail({
        to: appointment.email,
        subject: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)} - Aditya University`,
        html
      }).catch(() => { });
    }

    // If approved, generate OTP (similar to existing approve logic)
    if (status === 'approved') {
      // Invalidate previous OTPs
      const OTP = require('../models/OTP');
      await OTP.updateMany({ appointmentId: appointment._id, used: false }, { $set: { used: true } });

      const otp = generateOTP();
      const codeHash = await bcrypt.hash(otp, 10);
      const otpHash = hashOTP(otp);
      const ttlMinutes = 525600; // 1 year
      const expiresAt = dayjs().add(ttlMinutes, 'minute').toDate();
      const record = await OTP.create({ appointmentId: appointment._id, codeHash, expiresAt });
      appointment.otpRef = record._id;
      appointment.otpHash = otpHash;
      appointment.otpExpiresAt = expiresAt;
      await appointment.save();

      // Send OTP email
      const dateStr = appointment.dateOfVisit
        ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
        : dayjs(appointment.createdAt).format('YYYY-MM-DD');
      const timeStr = appointment.timeOfVisit || dayjs(appointment.createdAt).format('HH:mm');

      if (appointment.email) {
        const html = getOtpTemplate(appointment.name, appointment.personToMeet, dateStr, timeStr, otp);
        sendEmail({
          to: appointment.email,
          subject: 'Appointment Approved - Aditya University',
          html
        }).catch(() => { });
      }
    }

    AuditLog.create({
      actorId: req.user._id,
      action: 'appointment.updateStatus',
      resource: String(appointment._id),
      details: { oldStatus, newStatus: status, message }
    }).catch(() => { });

    // Emit WebSocket event for appointment status update
    if (global.io) {
      global.io.emit('appointment_status_updated', {
        id: appointment._id,
        visitorName: appointment.name,
        personToMeet: appointment.personToMeet,
        status: appointment.status,
        oldStatus,
        dateOfVisit: appointment.dateOfVisit,
        timeOfVisit: appointment.timeOfVisit,
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      data: appointment
    });
  } catch (err) {
    next(err);
  }
};

// ============ NEW APPOINTMENT MANAGEMENT ENDPOINTS ============

const appointmentService = require('../services/appointmentService');

/**
 * POST /api/appointments/:id/reject
 * Reject a single appointment with reason
 */
exports.rejectAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Authorization check: Admin can reject any, Staff can only reject their own
    if (userRole === 'staff') {
      const appointment = await Visitor.findById(id);
      if (!appointment) {
        return next(createError(404, 'Appointment not found'));
      }
      if (appointment.staffId && appointment.staffId.toString() !== userId.toString()) {
        return next(createError(403, 'You can only reject your own appointments'));
      }
    }

    const result = await appointmentService.rejectAppointment(id, userId, userRole, reason, ipAddress);

    res.json({
      success: true,
      message: 'Appointment rejected successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/appointments/:id/reschedule
 * Reschedule an appointment with new date/time and reason
 */
exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPreferredDate, newPreferredTime, reason, scheduledStart, scheduledEnd } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Authorization check: Admin can reschedule any, Staff can only reschedule their own
    if (userRole === 'staff') {
      const appointment = await Visitor.findById(id);
      if (!appointment) {
        return next(createError(404, 'Appointment not found'));
      }
      if (appointment.staffId && appointment.staffId.toString() !== userId.toString()) {
        return next(createError(403, 'You can only reschedule your own appointments'));
      }
    }

    const result = await appointmentService.rescheduleAppointment(
      id,
      userId,
      userRole,
      newPreferredDate,
      newPreferredTime,
      reason,
      scheduledStart,
      scheduledEnd,
      ipAddress
    );

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/appointments/bulk-action
 * Bulk approve or reject appointments (Admin only)
 */
exports.bulkActionAppointments = async (req, res, next) => {
  try {
    const { action, appointmentIds, reason } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Validate action
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return next(createError(400, 'Invalid action. Must be APPROVE or REJECT'));
    }

    // Validate appointmentIds
    if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return next(createError(400, 'No appointment IDs provided'));
    }

    let result;

    if (action === 'APPROVE') {
      result = await appointmentService.bulkApproveAppointments(appointmentIds, userId, userRole, ipAddress);
    } else if (action === 'REJECT') {
      if (!reason) {
        return next(createError(400, 'Rejection reason is required for bulk reject'));
      }
      result = await appointmentService.bulkRejectAppointments(appointmentIds, userId, userRole, reason, ipAddress);
    }

    res.json({
      success: true,
      message: `Bulk ${action.toLowerCase()} completed`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/appointments/:id/logs
 * Get audit logs for a specific appointment
 */
exports.getAppointmentLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user._id;

    // Authorization check: Admin can view all, Staff can only view their own
    if (userRole === 'staff') {
      const appointment = await Visitor.findById(id);
      if (!appointment) {
        return next(createError(404, 'Appointment not found'));
      }
      if (appointment.staffId && appointment.staffId.toString() !== userId.toString()) {
        return next(createError(403, 'You can only view logs for your own appointments'));
      }
    }

    const logs = await appointmentService.getAppointmentLogs(id);

    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Enhanced GET /api/appointments/stats
 * Get appointment statistics with optional filters
 */
exports.getEnhancedStats = async (req, res, next) => {
  try {
    const { departmentId, fromDate, toDate } = req.query;

    const filters = {};
    if (departmentId) filters.departmentId = departmentId;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const stats = await appointmentService.getAppointmentStats(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/appointments/dashboard/staff-stats
 * Get real-time stats for logged-in staff member
 * Stats are strictly scoped to the requesting user
 * 
 * Returns:
 * {
 *   "success": true,
 *   "data": {
 *     "totalAppointments": 128,
 *     "pending": 6,
 *     "approved": 94,
 *     "rejected": 12
 *   }
 * }
 */
exports.getStaffDashboardStats = async (req, res, next) => {
  try {
    const staffId = req.user._id;

    // Strict MongoDB aggregation for accuracy
    const [total, pending, approved, rejected] = await Promise.all([
      Visitor.countDocuments({ staffId }),
      Visitor.countDocuments({ staffId, status: 'pending' }),
      Visitor.countDocuments({ staffId, status: 'approved' }),
      Visitor.countDocuments({ staffId, status: 'rejected' })
    ]);

    res.json({
      success: true,
      data: {
        totalAppointments: total,
        pending,
        approved,
        rejected
      }
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/appointments/:id/otp/regenerate
 * Regenerate OTP (Admin Only)
 */
exports.regenerateOTP = async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const dayjs = require('dayjs');
    const Visitor = require('../models/Visitor');
    const OtpAttemptLog = require('../models/OtpAttemptLog');
    // const { createAuditLog } = require('../services/auditLogService'); // Removed as it does not exist in the services directory

    const { id } = req.params;
    const visitor = await Visitor.findById(id);

    if (!visitor) return next(createError(404, 'Appointment not found'));

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    visitor.otpHash = otpHash;
    visitor.otpExpiresAt = dayjs().add(24, 'hour').toDate(); // Reset expiry to 24h from now
    visitor.otpAttempts = 0; // Reset attempts

    // Note: We don't change status. If it was 'pending' or 'approved', it stays that way.
    // However, if the user was 'rejected', maybe we should check? 
    // Usually Admin knows what they are doing.

    await visitor.save();

    // Log the action
    // Try to use existing logging mechanisms if possible, otherwise console.
    // console.log(`[OTP] Regenerated for visitor ${visitor.name} by ${req.user.name}`);
    // If OtpAttemptLog is only for verify actions, maybe we don't spam it. 
    // But audit log is good.

    res.json({
      success: true,
      message: 'OTP regenerated successfully',
      data: { otp } // Send plaintext OTP
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/appointments/:id/otp/resend
 * Resend OTP to visitor (Admin and Staff)
 */
exports.resendOTP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Authorization check: Staff can only resend OTP for their own appointments
    if (userRole === 'staff') {
      const Visitor = require('../models/Visitor');
      const visitor = await Visitor.findById(id);
      if (!visitor) {
        return next(createError(404, 'Appointment not found'));
      }
      if (visitor.staffId && visitor.staffId.toString() !== userId.toString()) {
        return next(createError(403, 'You can only resend OTP for your own appointments'));
      }
    }

    const { resendOTP } = require('../services/appointmentService');
    const result = await resendOTP(id, userId, userRole, ipAddress);

    res.json(result);
  } catch (err) {
    next(err);
  }
};


