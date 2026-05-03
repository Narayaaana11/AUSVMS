const bcrypt = require('bcrypt');
const dayjs = require('dayjs');
const crypto = require('crypto');
const Visitor = require('../models/Visitor');
const AppointmentLog = require('../models/AppointmentLog');
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendEmail } = require('../utils/notify');
const { hashOTP } = require('../utils/otp');
const {
    getOtpTemplate,
    getAppointmentStatusChangeTemplate,
    getAppointmentRescheduledTemplate
} = require('../utils/emailTemplates');
const logger = require('../utils/logger');

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
    return String(crypto.randomInt(100000, 999999));
}

/**
 * Log an appointment action to AppointmentLog collection
 */
async function logAppointmentAction(appointmentId, action, performedBy, performedByRole, oldValues = {}, newValues = {}, reason = '', ipAddress = '') {
    try {
        await AppointmentLog.create({
            appointmentId,
            action,
            performedBy,
            performedByRole,
            oldValues,
            newValues,
            reason,
            ipAddress,
            metadata: {}
        });
    } catch (err) {
        logger.error('Failed to create appointment log', { error: err.message, appointmentId, action });
    }
}

/**
 * Approve a single appointment
 * - Invalidates previous OTPs
 * - Generates new OTP
 * - Updates status to 'approved'
 * - Sends email to visitor and staff
 * - Logs action
 * - Emits WebSocket event
 */
async function approveAppointment(appointmentId, userId, userRole, note = '', scheduledStart = null, scheduledEnd = null, ipAddress = '') {
    const visitor = await Visitor.findById(appointmentId).populate('staffId', 'name email').populate('requesterId', 'name email');

    if (!visitor) {
        throw new Error('Appointment not found');
    }

    // Check if already approved
    if (visitor.status === 'approved') {
        throw new Error('Appointment is already approved');
    }

    const oldStatus = visitor.status;

    // Mark as approved
    visitor.status = 'approved';

    // Set scheduled times if provided
    if (scheduledStart) {
        visitor.scheduledStart = new Date(scheduledStart);
    }
    if (scheduledEnd) {
        visitor.scheduledEnd = new Date(scheduledEnd);
    }

    // Add note if provided
    if (note) {
        const noteText = `[${new Date().toISOString()}] Approved by ${userId}: ${note}`;
        visitor.notes = visitor.notes ? `${visitor.notes}\n${noteText}` : noteText;
    }

    await visitor.save();

    // Check if this is a staff-to-staff appointment
    const isStaffToStaff = visitor.requesterType === 'STAFF';

    // Only generate OTP for non-staff appointments (visitor appointments)
    let otp = null;
    let otpRecord = null;
    if (!isStaffToStaff) {
        // Invalidate previous OTPs
        await OTP.updateMany(
            { appointmentId: visitor._id, used: false },
            { $set: { used: true } }
        );

        // Generate new OTP
        otp = generateOTP();
        const codeHash = await bcrypt.hash(otp, 10);
        const otpHash = hashOTP(otp);
        const ttlMinutes = 1440; // 24 hours (1 day)
        const expiresAt = dayjs().add(ttlMinutes, 'minute').toDate();
        otpRecord = await OTP.create({
            appointmentId: visitor._id,
            codeHash,
            expiresAt
        });

        visitor.otpRef = otpRecord._id;
        visitor.otpHash = otpHash;
        visitor.otpExpiresAt = expiresAt;
        visitor.otpAttempts = 0; // Reset attempts on new OTP
        await visitor.save();
    }

    // Send email to requester (visitor or staff)
    if (visitor.email) {
        const dateStr = visitor.dateOfVisit
            ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
            : dayjs(visitor.createdAt).format('YYYY-MM-DD');
        const timeStr = visitor.timeOfVisit || dayjs(visitor.createdAt).format('HH:mm');

        let html;
        let subject;

        if (isStaffToStaff) {
            // Staff-to-staff: No OTP, just confirmation email
            html = `
                <h2>Appointment Scheduled ✓</h2>
                <p>Hi ${visitor.name},</p>
                <p>Your appointment has been scheduled successfully!</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>📅 Appointment Details:</strong></p>
                    <ul style="list-style: none; padding: 0;">
                        <li>📋 <strong>Person:</strong> ${visitor.personToMeet}</li>
                        <li>📝 <strong>Purpose:</strong> ${visitor.purposeOfVisit}</li>
                        <li>📅 <strong>Date:</strong> ${dateStr}</li>
                        <li>⏰ <strong>Time:</strong> ${timeStr}</li>
                    </ul>
                </div>
                <p>Please mark your calendar. No OTP is required for staff appointments.</p>
                ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                <p>If you have any questions, please contact the respective staff member.</p>
                <p>Regards,<br/>Aditya University Visitor Management System</p>
            `;
            subject = 'Appointment Scheduled - Aditya University';
        } else {
            // Visitor: Send OTP email
            html = getOtpTemplate(
                visitor.name,
                visitor.personToMeet,
                dateStr,
                timeStr,
                otp
            );
            subject = 'Appointment Approved - Aditya University';
        }

        sendEmail({
            to: visitor.email,
            subject: subject,
            html: html
        }).catch((err) => logger.error('Failed to send approval email to requester', { error: err.message }));
    }

    // Send email to staff (the person being met)
    if (visitor.staffId && visitor.staffId.email) {
        const dateStr = visitor.dateOfVisit
            ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
            : dayjs(visitor.createdAt).format('YYYY-MM-DD');
        const timeStr = visitor.timeOfVisit || dayjs(visitor.createdAt).format('HH:mm');

        let staffHtml;
        let subject;

        if (isStaffToStaff) {
            // Staff-to-staff: Confirmation email to the staff being met
            staffHtml = `
                <h2>Appointment Confirmed ✓</h2>
                <p>Hi ${visitor.staffId.name},</p>
                <p>You have confirmed an appointment with:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <ul style="list-style: none; padding: 0;">
                        <li>👤 <strong>Staff Member:</strong> ${visitor.name}</li>
                        <li>📝 <strong>Purpose:</strong> ${visitor.purposeOfVisit}</li>
                        <li>📅 <strong>Date:</strong> ${dateStr}</li>
                        <li>⏰ <strong>Time:</strong> ${timeStr}</li>
                    </ul>
                </div>
                <p>Please mark your calendar.</p>
                ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                <p>Regards,<br/>Aditya University Visitor Management System</p>
            `;
            subject = 'Appointment Confirmed - Aditya University';
        } else {
            // Visitor: Send staff the OTP
            staffHtml = `
                <h2>Appointment Approved</h2>
                <p>You have an approved appointment:</p>
                <ul>
                    <li><strong>Visitor:</strong> ${visitor.name}</li>
                    <li><strong>Contact:</strong> ${visitor.contactNumber}</li>
                    <li><strong>Purpose:</strong> ${visitor.purposeOfVisit}</li>
                    <li><strong>Date:</strong> ${dateStr}</li>
                    <li><strong>Time:</strong> ${timeStr}</li>
                    <li><strong>OTP:</strong> ${otp}</li>
                </ul>
                ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
            `;
            subject = 'Appointment Approved - Aditya University';
        }

        sendEmail({
            to: visitor.staffId.email,
            subject: subject,
            html: staffHtml
        }).catch((err) => logger.error('Failed to send approval email to staff', { error: err.message }));
    }

    // Log action
    await logAppointmentAction(
        visitor._id,
        'APPROVED',
        userId,
        userRole,
        { status: oldStatus },
        { status: 'approved', otp: otpRecord._id },
        note,
        ipAddress
    );

    // Emit WebSocket event to staff-specific room
    if (global.io && visitor.staffId) {
        const staffRoom = `staff:${visitor.staffId._id.toString()}`;

        // Emit KPI Update Trigger (Frontend should refetch stats)
        global.io.to(staffRoom).emit('kpi_update', {
            type: 'appointment_approved',
            appointmentId: visitor._id,
            staffId: visitor.staffId._id
        });

        // Emit Recent Activity Feed Item
        global.io.to(staffRoom).emit('recent_activity', {
            id: visitor._id.toString(),
            type: 'APPROVED',
            title: 'Appointment Approved',
            description: `${visitor.name} - ${visitor.purposeOfVisit}`,
            appointmentId: visitor._id,
            status: 'approved',
            createdAt: new Date(),
            createdBy: {
                id: userId,
                name: userId?.name || 'System',
                role: userRole
            }
        });
    }

    // Also emit global event for admin dashboard
    if (global.io) {
        global.io.emit('appointment_status_updated', {
            id: visitor._id,
            visitorName: visitor.name,
            personToMeet: visitor.personToMeet,
            status: 'approved',
            oldStatus,
            dateOfVisit: visitor.dateOfVisit,
            timeOfVisit: visitor.timeOfVisit,
            updatedAt: new Date()
        });
    }

    return { success: true, otp, otpId: otpRecord._id };
}

/**
 * Reject a single appointment
 * - Updates status to 'rejected'
 * - Stores rejection reason
 * - Sends email to visitor and staff
 * - Logs action
 * - Emits WebSocket event
 */
async function rejectAppointment(appointmentId, userId, userRole, reason, ipAddress = '') {
    if (!reason || reason.trim() === '') {
        throw new Error('Rejection reason is required');
    }

    const visitor = await Visitor.findById(appointmentId).populate('staffId', 'name email');

    if (!visitor) {
        throw new Error('Appointment not found');
    }

    // Check if already rejected or cancelled
    if (visitor.status === 'rejected' || visitor.status === 'cancelled') {
        throw new Error('Appointment is already rejected or cancelled');
    }

    const oldStatus = visitor.status;

    visitor.status = 'rejected';
    visitor.rejectionReason = reason;
    await visitor.save();

    // Send email to visitor
    if (visitor.email) {
        const dateStr = visitor.dateOfVisit
            ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
            : dayjs(visitor.createdAt).format('YYYY-MM-DD');
        const timeStr = visitor.timeOfVisit || dayjs(visitor.createdAt).format('HH:mm');

        const html = `
      <h2>Appointment Rejected</h2>
      <p>Dear ${visitor.name},</p>
      <p>Unfortunately, your appointment request with ${visitor.personToMeet} scheduled for ${dateStr} at ${timeStr} has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please contact the university for more information or to reschedule.</p>
    `;

        sendEmail({
            to: visitor.email,
            subject: 'Appointment Rejected - Aditya University',
            html
        }).catch((err) => logger.error('Failed to send rejection email to visitor', { error: err.message }));
    }

    // Send email to staff
    if (visitor.staffId && visitor.staffId.email) {
        const staffHtml = `
      <h2>Appointment Rejected</h2>
      <p>The appointment request from ${visitor.name} (${visitor.contactNumber}) has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
    `;

        sendEmail({
            to: visitor.staffId.email,
            subject: 'Appointment Rejected - Aditya University',
            html: staffHtml
        }).catch((err) => logger.error('Failed to send rejection email to staff', { error: err.message }));
    }

    // Log action
    await logAppointmentAction(
        visitor._id,
        'REJECTED',
        userId,
        userRole,
        { status: oldStatus },
        { status: 'rejected', rejectionReason: reason },
        reason,
        ipAddress
    );

    // Emit WebSocket event to staff-specific room
    if (global.io && visitor.staffId) {
        const staffRoom = `staff:${visitor.staffId._id.toString()}`;

        // Emit KPI Update Trigger (Frontend should refetch stats)
        global.io.to(staffRoom).emit('kpi_update', {
            type: 'appointment_rejected',
            appointmentId: visitor._id,
            staffId: visitor.staffId._id
        });

        // Emit Recent Activity Feed Item
        global.io.to(staffRoom).emit('recent_activity', {
            id: visitor._id.toString(),
            type: 'REJECTED',
            title: 'Appointment Rejected',
            description: `${visitor.name} - ${visitor.purposeOfVisit}`,
            appointmentId: visitor._id,
            status: 'rejected',
            createdAt: new Date(),
            createdBy: {
                id: userId,
                name: userId?.name || 'System',
                role: userRole
            }
        });
    }

    // Also emit global event for admin dashboard
    if (global.io) {
        global.io.emit('appointment_status_updated', {
            id: visitor._id,
            visitorName: visitor.name,
            personToMeet: visitor.personToMeet,
            status: 'rejected',
            oldStatus,
            reason,
            dateOfVisit: visitor.dateOfVisit,
            timeOfVisit: visitor.timeOfVisit,
            updatedAt: new Date()
        });
    }

    return { success: true };
}

/**
 * Reschedule an appointment
 * - Validates new date/time is not in the past
 * - Updates dateOfVisit, timeOfVisit, scheduledStart, scheduledEnd
 * - Sends email to visitor and staff
 * - Logs action with old and new values
 * - Emits WebSocket event
 */
async function rescheduleAppointment(appointmentId, userId, userRole, newPreferredDate, newPreferredTime, reason, scheduledStart = null, scheduledEnd = null, ipAddress = '') {
    if (!reason || reason.trim() === '') {
        throw new Error('Reschedule reason is required');
    }

    const visitor = await Visitor.findById(appointmentId).populate('staffId', 'name email');

    if (!visitor) {
        throw new Error('Appointment not found');
    }

    // Validate new date is not in the past
    if (newPreferredDate) {
        const newDate = new Date(newPreferredDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (newDate < today) {
            throw new Error('Cannot reschedule to a past date');
        }
    }

    // Store old values for audit log
    const oldValues = {
        dateOfVisit: visitor.dateOfVisit,
        timeOfVisit: visitor.timeOfVisit,
        scheduledStart: visitor.scheduledStart,
        scheduledEnd: visitor.scheduledEnd,
        status: visitor.status
    };

    // Update with new values
    if (newPreferredDate) {
        visitor.dateOfVisit = new Date(newPreferredDate);
    }
    if (newPreferredTime) {
        visitor.timeOfVisit = newPreferredTime;
    }
    if (scheduledStart) {
        visitor.scheduledStart = new Date(scheduledStart);
    }
    if (scheduledEnd) {
        visitor.scheduledEnd = new Date(scheduledEnd);
    }

    // Update status to 'rescheduled' or keep as pending based on business rule
    // For now, we'll keep it as rescheduled if it was approved, otherwise pending
    if (visitor.status === 'approved') {
        visitor.status = 'rescheduled';
    }

    await visitor.save();

    // Send email to visitor
    if (visitor.email) {
        const oldDateStr = oldValues.dateOfVisit
            ? dayjs(oldValues.dateOfVisit).format('YYYY-MM-DD')
            : 'N/A';
        const oldTimeStr = oldValues.timeOfVisit || 'N/A';
        const newDateStr = visitor.dateOfVisit
            ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
            : 'N/A';
        const newTimeStr = visitor.timeOfVisit || 'N/A';

        try {
            const html = getAppointmentRescheduledTemplate(
                visitor.name,
                visitor.personToMeet,
                oldDateStr,
                oldTimeStr,
                newDateStr,
                newTimeStr,
                reason
            );
            const emailSent = await sendEmail({
                to: visitor.email,
                subject: 'Appointment Rescheduled - Aditya University',
                html
            });
            if (emailSent) {
                logger.info('Reschedule email sent to visitor', { visitorId: visitor._id, email: visitor.email });
            } else {
                logger.warn('Reschedule email failed for visitor', { visitorId: visitor._id, email: visitor.email });
            }
        } catch (err) {
            logger.error('Failed to send reschedule email to visitor', { visitorId: visitor._id, email: visitor.email, error: err.message });
        }
    } else {
        logger.warn('Cannot send reschedule email: visitor email not found', { visitorId: visitor._id });
    }

    // Send email to staff
    if (visitor.staffId && visitor.staffId.email) {
        const oldDateStr = oldValues.dateOfVisit
            ? dayjs(oldValues.dateOfVisit).format('YYYY-MM-DD')
            : 'N/A';
        const oldTimeStr = oldValues.timeOfVisit || 'N/A';
        const newDateStr = visitor.dateOfVisit
            ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
            : 'N/A';
        const newTimeStr = visitor.timeOfVisit || 'N/A';

        try {
            const staffHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0F172A; margin-top: 0;">Appointment Rescheduled</h2>
              <p>The appointment with <strong>${visitor.name}</strong> (${visitor.contactNumber}) has been rescheduled.</p>
              <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 8px 0;"><strong>Visitor:</strong> ${visitor.name}</p>
                <p style="margin: 8px 0;"><strong>Contact:</strong> ${visitor.contactNumber}</p>
                <p style="margin: 8px 0;"><strong>Previous Schedule:</strong> ${oldDateStr} at ${oldTimeStr}</p>
                <p style="margin: 8px 0;"><strong>New Schedule:</strong> ${newDateStr} at ${newTimeStr}</p>
                <p style="margin: 8px 0;"><strong>Reason:</strong> ${reason}</p>
              </div>
              <p>Please update your calendar accordingly.</p>
            </div>
            `;
            const emailSent = await sendEmail({
                to: visitor.staffId.email,
                subject: 'Appointment Rescheduled - Aditya University',
                html: staffHtml
            });
            if (emailSent) {
                logger.info('Reschedule email sent to staff', { staffId: visitor.staffId._id, email: visitor.staffId.email });
            } else {
                logger.warn('Reschedule email failed for staff', { staffId: visitor.staffId._id, email: visitor.staffId.email });
            }
        } catch (err) {
            logger.error('Failed to send reschedule email to staff', { staffId: visitor.staffId._id, email: visitor.staffId.email, error: err.message });
        }
    } else {
        logger.warn('Cannot send reschedule email to staff: staff not found or email missing', { visitorId: visitor._id, hasStaffId: !!visitor.staffId });
    }

    // Log action with old and new values
    await logAppointmentAction(
        visitor._id,
        'RESCHEDULED',
        userId,
        userRole,
        oldValues,
        {
            dateOfVisit: visitor.dateOfVisit,
            timeOfVisit: visitor.timeOfVisit,
            scheduledStart: visitor.scheduledStart,
            scheduledEnd: visitor.scheduledEnd,
            status: visitor.status
        },
        reason,
        ipAddress
    );

    // Emit WebSocket event to staff-specific room
    if (global.io && visitor.staffId) {
        const staffRoom = `staff:${visitor.staffId._id.toString()}`;

        // Emit KPI Update Trigger (Frontend should refetch stats)
        global.io.to(staffRoom).emit('kpi_update', {
            type: 'appointment_rescheduled',
            appointmentId: visitor._id,
            staffId: visitor.staffId._id
        });

        // Emit Recent Activity Feed Item
        global.io.to(staffRoom).emit('recent_activity', {
            id: visitor._id.toString(),
            type: 'RESCHEDULED',
            title: 'Appointment Rescheduled',
            description: `${visitor.name} - ${visitor.purposeOfVisit}`,
            appointmentId: visitor._id,
            status: 'rescheduled',
            createdAt: new Date(),
            createdBy: {
                id: userId,
                name: userId?.name || 'System',
                role: userRole
            }
        });
    }

    // Also emit global event for admin dashboard
    if (global.io) {
        global.io.emit('appointment_rescheduled', {
            id: visitor._id,
            visitorName: visitor.name,
            personToMeet: visitor.personToMeet,
            oldDate: oldValues.dateOfVisit,
            oldTime: oldValues.timeOfVisit,
            newDate: visitor.dateOfVisit,
            newTime: visitor.timeOfVisit,
            scheduledStart: visitor.scheduledStart,
            scheduledEnd: visitor.scheduledEnd,
            reason,
            updatedAt: new Date()
        });
    }

    return { success: true };
}

/**
 * Bulk approve appointments (Admin only)
 * - Processes multiple appointments in batched operations
 * - Returns per-id results (success/failure)
 * - Sends batched email notifications
 * - Emits single WebSocket event with summary
 */
async function bulkApproveAppointments(appointmentIds, userId, userRole, ipAddress = '') {
    if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        throw new Error('No appointment IDs provided');
    }

    // Limit to 200 per request
    if (appointmentIds.length > 200) {
        throw new Error('Bulk operation limited to 200 appointments per request');
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const id of appointmentIds) {
        try {
            await approveAppointment(id, userId, userRole, 'Bulk approved', null, null, ipAddress);
            results.push({ id, success: true });
            successCount++;
        } catch (err) {
            results.push({ id, success: false, error: err.message });
            failureCount++;
            logger.error('Bulk approve failed for appointment', { id, error: err.message });
        }
    }

    // Emit WebSocket summary
    if (global.io) {
        global.io.emit('appointments_bulk_updated', {
            action: 'BULK_APPROVED',
            totalProcessed: appointmentIds.length,
            approvedCount: successCount,
            rejectedCount: 0,
            failedCount: failureCount,
            timestamp: new Date()
        });
    }

    return {
        success: true,
        totalProcessed: appointmentIds.length,
        successCount,
        failureCount,
        results
    };
}

/**
 * Bulk reject appointments (Admin only)
 * - Processes multiple appointments in batched operations
 * - Applies common reason to all
 * - Returns per-id results (success/failure)
 * - Sends batched email notifications
 * - Emits single WebSocket event with summary
 */
async function bulkRejectAppointments(appointmentIds, userId, userRole, reason, ipAddress = '') {
    if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
        throw new Error('No appointment IDs provided');
    }

    if (!reason || reason.trim() === '') {
        throw new Error('Rejection reason is required for bulk reject');
    }

    // Limit to 200 per request
    if (appointmentIds.length > 200) {
        throw new Error('Bulk operation limited to 200 appointments per request');
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const id of appointmentIds) {
        try {
            await rejectAppointment(id, userId, userRole, reason, ipAddress);
            results.push({ id, success: true });
            successCount++;
        } catch (err) {
            results.push({ id, success: false, error: err.message });
            failureCount++;
            logger.error('Bulk reject failed for appointment', { id, error: err.message });
        }
    }

    // Emit WebSocket summary
    if (global.io) {
        global.io.emit('appointments_bulk_updated', {
            action: 'BULK_REJECTED',
            totalProcessed: appointmentIds.length,
            approvedCount: 0,
            rejectedCount: successCount,
            failedCount: failureCount,
            timestamp: new Date()
        });
    }

    return {
        success: true,
        totalProcessed: appointmentIds.length,
        successCount,
        failureCount,
        results
    };
}

/**
 * Get appointment statistics
 * - Total, Pending, Approved, Rejected, Completed
 * - Optional breakdown by department or date range
 */
async function getAppointmentStats(filters = {}) {
    const baseQuery = {};

    // Apply filters if provided
    if (filters.staffId) {
        baseQuery.staffId = filters.staffId;
    }

    if (filters.departmentId) {
        baseQuery.departmentId = filters.departmentId;
    }

    if (filters.fromDate || filters.toDate) {
        baseQuery.createdAt = {};
        if (filters.fromDate) {
            baseQuery.createdAt.$gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
            const endDate = new Date(filters.toDate);
            endDate.setHours(23, 59, 59, 999);
            baseQuery.createdAt.$lte = endDate;
        }
    }

    const [total, pending, approved, rejected, completed, rescheduled, cancelled] = await Promise.all([
        Visitor.countDocuments(baseQuery),
        Visitor.countDocuments({ ...baseQuery, status: 'pending' }),
        Visitor.countDocuments({ ...baseQuery, status: 'approved' }),
        Visitor.countDocuments({ ...baseQuery, status: 'rejected' }),
        Visitor.countDocuments({ ...baseQuery, status: 'completed' }),
        Visitor.countDocuments({ ...baseQuery, status: 'rescheduled' }),
        Visitor.countDocuments({ ...baseQuery, status: 'cancelled' })
    ]);

    return {
        total,
        pending,
        approved,
        rejected,
        completed,
        rescheduled,
        cancelled
    };
}

/**
 * Get appointment logs for a specific appointment
 */
async function getAppointmentLogs(appointmentId) {
    const logs = await AppointmentLog.find({ appointmentId })
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 });

    return logs;
}

/**
 * Resend OTP to visitor
 * - Generates new OTP with same expiry rules
 * - Sends email and SMS/WhatsApp to visitor
 * - Logs the action
 */
async function resendOTP(appointmentId, userId, userRole, ipAddress = '') {
    const visitor = await Visitor.findById(appointmentId).populate('staffId', 'name email');

    if (!visitor) {
        throw new Error('Appointment not found');
    }

    // Check if appointment is in a state that can receive OTP
    if (!['approved', 'expected', 'checked-in'].includes(visitor.status)) {
        throw new Error('OTP can only be resent for approved appointments');
    }

    // Check if visitor has email or phone
    if (!visitor.email && !visitor.contactNumber) {
        throw new Error('Visitor has no email or phone number to receive OTP');
    }

    // Generate a new OTP (since we can't decrypt the hashed one)
    const otp = generateOTP();
    const codeHash = await bcrypt.hash(otp, 10);
    const ttlMinutes = 1440; // 24 hours
    const expiresAt = dayjs().add(ttlMinutes, 'minute').toDate();

    // Invalidate all previous OTPs for this appointment
    await OTP.updateMany(
        { appointmentId: visitor._id, used: false },
        { $set: { used: true } }
    );

    // Create or update OTP record
    const otpRecord = await OTP.create({
        appointmentId: visitor._id,
        codeHash,
        expiresAt,
        used: false,
        attempts: 0
    });

    // Update visitor OTP info
    visitor.otpRef = otpRecord._id;
    visitor.otpHash = otpHash;
    visitor.otpExpiresAt = expiresAt;
    visitor.otpAttempts = 0;
    await visitor.save();

    // Format date and time for emails
    const dateStr = visitor.dateOfVisit
        ? dayjs(visitor.dateOfVisit).format('YYYY-MM-DD')
        : dayjs(visitor.createdAt).format('YYYY-MM-DD');
    const timeStr = visitor.timeOfVisit || dayjs(visitor.createdAt).format('HH:mm');

    // Send email to visitor
    if (visitor.email) {
        const html = getOtpTemplate(
            visitor.name,
            visitor.personToMeet,
            dateStr,
            timeStr,
            otp
        );

        sendEmail({
            to: visitor.email,
            subject: 'OTP Resent - Aditya University',
            html
        }).catch((err) => logger.error('Failed to resend OTP email to visitor', { error: err.message }));
    }

    // Send SMS/WhatsApp if phone number exists
    if (visitor.contactNumber) {
        try {
            const { sendWhatsApp } = require('../utils/notify');
            const text = `Hello ${visitor.name},\n\nYour OTP for appointment with ${visitor.personToMeet} on ${dateStr} at ${timeStr} is: ${otp}\n\nValid for 24 hours.\n\n- Aditya University`;
            sendWhatsApp({ to: visitor.contactNumber, message: text }).catch((err) =>
                logger.error('Failed to send OTP WhatsApp', { error: err.message })
            );
        } catch (e) {
            logger.error('WhatsApp service error', { error: e.message });
        }
    }

    // Log action
    await logAppointmentAction(
        visitor._id,
        'OTP_RESENT',
        userId,
        userRole,
        {},
        { otpExpiresAt: expiresAt },
        'OTP resent to visitor',
        ipAddress
    );

    // Emit WebSocket event
    if (global.io && visitor.staffId) {
        global.io.to(`staff:${visitor.staffId}`).emit('otp_resent', {
            appointmentId: visitor._id,
            visitorName: visitor.name
        });
    }

    return {
        success: true,
        message: 'OTP resent successfully',
        sentTo: {
            email: visitor.email ? visitor.email : null,
            phone: visitor.contactNumber ? visitor.contactNumber : null
        }
    };
}

module.exports = {
    approveAppointment,
    rejectAppointment,
    rescheduleAppointment,
    bulkApproveAppointments,
    bulkRejectAppointments,
    resendOTP,
    getAppointmentStats,
    getAppointmentLogs,
    logAppointmentAction
};
