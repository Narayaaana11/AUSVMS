const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment');
const AppointmentLog = require('../models/AppointmentLog');
const User = require('../models/User');
const Department = require('../models/Department');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const dayjs = require('dayjs');
const { sendEmail } = require('../utils/notify');
const { hashOTP } = require('../utils/otp');
const {
    getAppointmentRescheduledTemplate,
    getAppointmentRejectedTemplate
} = require('../utils/emailTemplates');
const logger = require('../utils/logger');

/**
 * Request Service
 * Business logic for managing incoming appointment requests
 */

class RequestService {
    /**
     * Get paginated and filtered requests
     * @param {Object} filters - Filter parameters
     * @param {Object} user - Current user object
     * @returns {Promise<Object>} - Paginated results
     */
    static async getRequests(filters, user) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                status = '',
                staffId = '',
                departmentId = '',
                fromDate = '',
                toDate = '',
                sortBy = 'createdAt',
                sortOrder = 'desc',
            } = filters;

            // Build query
            const query = {};

            // Role-based filtering
            if (user.role === 'staff') {
                query.staffId = user._id;
            } else if (staffId) {
                query.staffId = staffId;
            }

            // Status filter
            if (status) {
                query.status = status.toUpperCase();
            }

            // Department filter
            if (departmentId) {
                query.departmentId = departmentId;
            }

            // Date range filter
            if (fromDate || toDate) {
                query.preferredDate = {};
                if (fromDate) {
                    query.preferredDate.$gte = new Date(fromDate);
                }
                if (toDate) {
                    query.preferredDate.$lte = new Date(toDate);
                }
            }

            // Search filter (text search)
            if (search) {
                query.$or = [
                    { visitorName: { $regex: search, $options: 'i' } },
                    { visitorEmail: { $regex: search, $options: 'i' } },
                    { visitorPhone: { $regex: search, $options: 'i' } },
                    { purpose: { $regex: search, $options: 'i' } },
                ];
            }

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            // Execute query
            const [requests, total] = await Promise.all([
                Visitor.find(query)
                    .populate('staffId', 'name email')
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Visitor.countDocuments(query),
            ]);

            // Calculate page count
            const pageCount = Math.ceil(total / parseInt(limit));

            return {
                requests,
                total,
                page: parseInt(page),
                pageCount,
                limit: parseInt(limit),
            };
        } catch (error) {
            logger.error('RequestService.getRequests error:', error);
            throw error;
        }
    }

    /**
     * Get single request by ID with logs
     * @param {String} id - Appointment ID
     * @param {Object} user - Current user object
     * @returns {Promise<Object>} - Appointment with logs
     */
    static async getRequestById(id, user) {
        try {
            const appointment = await Appointment.findById(id)
                .populate('staffId', 'name email phone')
                .populate('departmentId', 'name')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .lean();

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            // Check permissions
            if (user.role === 'staff' && appointment.staffId?._id.toString() !== user._id.toString()) {
                throw new Error('Unauthorized access');
            }

            // Get appointment logs
            const logs = await AppointmentLog.find({ appointmentId: id })
                .populate('performedBy', 'name email')
                .sort({ createdAt: -1 })
                .lean();

            return {
                ...appointment,
                logs,
            };
        } catch (error) {
            logger.error('RequestService.getRequestById error:', error);
            throw error;
        }
    }

    /**
     * Approve a request
     * @param {String} id - Appointment ID
     * @param {Object} data - Approval data
     * @param {Object} user - Current user object
     * @returns {Promise<Object>} - Updated appointment
     */
    static async approveRequest(id, data, user) {
        try {
            const { scheduledStart, scheduledEnd, note } = data;

            const appointment = await Visitor.findById(id).populate('staffId', 'name email');
            if (!appointment) {
                throw new Error('Appointment not found');
            }

            // Check permissions
            if (user.role === 'staff' && appointment.staffId?.toString() !== user._id.toString()) {
                throw new Error('Unauthorized access');
            }

            // Validate status
            if (!appointment.canBeModified()) {
                throw new Error(`Cannot approve appointment with status: ${appointment.status}`);
            }

            // Validate scheduled times if provided
            if (scheduledStart && scheduledEnd) {
                const start = new Date(scheduledStart);
                const end = new Date(scheduledEnd);

                if (start >= end) {
                    throw new Error('Scheduled end time must be after start time');
                }

                if (start < new Date()) {
                    throw new Error('Cannot schedule appointment in the past');
                }
            }

            // Store old values for audit
            const oldValues = {
                status: appointment.status,
                scheduledStart: appointment.scheduledStart,
                scheduledEnd: appointment.scheduledEnd,
            };

            // Update appointment
            appointment.status = 'APPROVED';
            appointment.updatedBy = user._id;

            if (scheduledStart) appointment.scheduledStart = new Date(scheduledStart);
            if (scheduledEnd) appointment.scheduledEnd = new Date(scheduledEnd);
            if (note) appointment.notes = note;

            await appointment.save();

            // Send email notifications
            try {
                const { sendEmail } = require('../utils/notify');
                const dayjs = require('dayjs');
                const { getAppointmentRejectedTemplate } = require('../utils/emailTemplates');

                // Notify visitor
                if (appointment.email) {
                    const dateStr = appointment.dateOfVisit
                        ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
                        : dayjs(appointment.createdAt).format('YYYY-MM-DD');
                    const timeStr = appointment.timeOfVisit || dayjs(appointment.createdAt).format('HH:mm');

                    const visitorHtml = getAppointmentRejectedTemplate(
                        appointment.name,
                        appointment.personToMeet,
                        dateStr,
                        timeStr,
                        reason
                    );
                    logger.info('Sending rejection email to visitor', { visitorId: appointment._id, visitorEmail: appointment.email });
                    const sentVisitor = await sendEmail({
                        to: appointment.email,
                        subject: 'Appointment Rejected - Aditya University',
                        html: visitorHtml
                    }).catch((e) => { logger.error('Failed to send rejection email to visitor', { error: e?.message, appointmentId: appointment._id }); return false; });
                    logger.debug('Visitor rejection email sent', { visitorId: appointment._id, status: sentVisitor });
                }

                // Notify staff
                if (appointment.staffId) {
                    const Staff = require('../models/User');
                    const staffUser = await Staff.findById(appointment.staffId);
                    if (staffUser?.email) {
                        const staffHtml = getAppointmentRejectedTemplate(
                            appointment.name,
                            appointment.personToMeet,
                            dateStr,
                            timeStr,
                            reason
                        );
                        logger.info('Sending rejection email to staff', { staffId: staffUser._id, staffEmail: staffUser.email, appointmentId: appointment._id });
                        const sentStaff = await sendEmail({
                            to: staffUser.email,
                            subject: 'Appointment Rejected - Aditya University',
                            html: staffHtml
                        }).catch((e) => { logger.error('Failed to send rejection email to staff', { error: e?.message, staffId: staffUser._id }); return false; });
                        logger.debug('Staff rejection email sent', { staffId: staffUser._id, status: sentStaff });
                    }
                }
            } catch (e) {
                // Non-fatal: log and continue
                logger.error('Reject email notification error:', e?.message || e);
            }

            // Send email notifications
            try {
                const { sendEmail } = require('../utils/notify');
                const dayjs = require('dayjs');

                const oldDateStr = oldValues.dateOfVisit
                    ? dayjs(oldValues.dateOfVisit).format('YYYY-MM-DD')
                    : 'N/A';
                const oldTimeStr = oldValues.timeOfVisit || 'N/A';
                const newDateStr = appointment.dateOfVisit
                    ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
                    : 'N/A';
                const newTimeStr = appointment.timeOfVisit || 'N/A';

                const { getAppointmentRescheduledTemplate, getAppointmentRejectedTemplate } = require('../utils/emailTemplates');
                // Notify visitor
                if (appointment.email) {
                    const visitorHtml = getAppointmentRescheduledTemplate(
                        appointment.name,
                        appointment.personToMeet,
                        oldDateStr,
                        oldTimeStr,
                        newDateStr,
                        newTimeStr,
                        reason
                    );
                    logger.info('Sending reschedule email to visitor', { visitorId: appointment._id, visitorEmail: appointment.email });
                    const sentVisitor = await sendEmail({
                        to: appointment.email,
                        subject: 'Appointment Rescheduled - Aditya University',
                        html: visitorHtml
                    }).catch((e) => { logger.error('Failed to send reschedule email to visitor', { error: e?.message, appointmentId: appointment._id }); return false; });
                    logger.debug('Visitor reschedule email sent', { visitorId: appointment._id, status: sentVisitor });
                }
                else {
                    logger.warn('No visitor email for reschedule notification', { appointmentId: appointment._id });
                }

                // Notify staff
                if (appointment.staffId) {
                    const Staff = require('../models/User');
                    const staffUser = await Staff.findById(appointment.staffId);
                    if (staffUser?.email) {
                        const staffHtml = getAppointmentRescheduledTemplate(
                            appointment.name,
                            appointment.personToMeet,
                            oldDateStr,
                            oldTimeStr,
                            newDateStr,
                            newTimeStr,
                            reason
                        );
                        logger.info('Sending reschedule email to staff', { staffId: staffUser._id, staffEmail: staffUser.email, appointmentId: appointment._id });
                        const sentStaff = await sendEmail({
                            to: staffUser.email,
                            subject: 'Appointment Rescheduled - Aditya University',
                            html: staffHtml
                        }).catch((e) => { logger.error('Failed to send reschedule email to staff', { error: e?.message, staffId: staffUser._id }); return false; });
                        logger.debug('Staff reschedule email sent', { staffId: staffUser._id, status: sentStaff });
                    }
                }
            } catch (e) {
                // Non-fatal: log and continue
                logger.error('Reschedule email notification error:', e?.message || e);
            }

            // Create audit log
            await AppointmentLog.create({
                appointmentId: appointment._id,
                action: 'APPROVED',
                performedBy: user._id,
                performedByRole: user.role,
                oldValues,
                newValues: {
                    status: 'APPROVED',
                    scheduledStart: appointment.scheduledStart,
                    scheduledEnd: appointment.scheduledEnd,
                },
                reason: note,
                ipAddress: data.ipAddress,
            });

            // Emit Socket.io event
            if (global.io) {
                const eventData = {
                    id: appointment._id,
                    status: 'APPROVED',
                    appointmentSummary: {
                        visitorName: appointment.visitorName,
                        purpose: appointment.purpose,
                        preferredDate: appointment.preferredDate,
                    },
                };

                // Emit to staff room
                if (appointment.staffId) {
                    global.io.to(`staff:${appointment.staffId}`).emit('request_updated', eventData);
                }

                // Emit to admin room
                global.io.to('admin').emit('request_updated', eventData);
            }

            // Queue notification (handled by notification service)
            // This would be integrated with your notification queue

            return appointment;
        } catch (error) {
            logger.error('RequestService.approveRequest error:', error);
            throw error;
        }
    }

    /**
     * Reject a request
     * @param {String} id - Appointment ID
     * @param {Object} data - Rejection data
     * @param {Object} user - Current user object
     * @returns {Promise<Object>} - Updated appointment
     */
    static async rejectRequest(id, data, user) {
        try {
            const { reason } = data;

            if (!reason || reason.trim().length === 0) {
                throw new Error('Rejection reason is required');
            }

            const appointment = await Visitor.findById(id);
            if (!appointment) {
                throw new Error('Appointment not found');
            }

            // Check permissions
            if (user.role === 'staff' && appointment.staffId?.toString() !== user._id.toString()) {
                throw new Error('Unauthorized access');
            }

            // Validate status - only pending can be rejected
            if (appointment.status !== 'pending') {
                throw new Error(`Cannot reject appointment with status: ${appointment.status}`);
            }

            // Store old values
            const oldValues = {
                status: appointment.status,
            };

            // Update appointment
            appointment.status = 'rejected';
            appointment.rejectionReason = reason;

            await appointment.save();

            // Notify visitor via email
            if (appointment.email) {
                const dateStr = appointment.dateOfVisit
                    ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
                    : 'N/A';
                const timeStr = appointment.timeOfVisit || 'N/A';

                try {
                    const html = getAppointmentRejectedTemplate(
                        appointment.name,
                        appointment.personToMeet,
                        dateStr,
                        timeStr,
                        reason
                    );
                    const emailSent = await sendEmail({
                        to: appointment.email,
                        subject: 'Appointment Rejected - Aditya University',
                        html
                    });
                    if (emailSent) {
                        logger.info('Rejection email sent to visitor (requestService)', { visitorId: appointment._id, email: appointment.email });
                    } else {
                        logger.warn('Rejection email failed for visitor (requestService)', { visitorId: appointment._id, email: appointment.email });
                    }
                } catch (err) {
                    logger.error('Failed to send rejection email to visitor (requestService)', {
                        visitorId: appointment._id,
                        email: appointment.email,
                        error: err.message
                    });
                }
            }

            // Create audit log
            await AppointmentLog.create({
                appointmentId: appointment._id,
                action: 'REJECTED',
                performedBy: user._id,
                performedByRole: user.role,
                oldValues,
                newValues: {
                    status: 'rejected',
                    rejectionReason: reason,
                },
                reason,
                ipAddress: data.ipAddress,
            });

            // Emit Socket.io event
            if (global.io) {
                const eventData = {
                    id: appointment._id,
                    status: 'rejected',
                    appointmentSummary: {
                        visitorName: appointment.name,
                        purpose: appointment.purposeOfVisit,
                        preferredDate: appointment.dateOfVisit,
                    },
                };

                if (appointment.staffId) {
                    global.io.to(`staff:${appointment.staffId}`).emit('request_updated', eventData);
                }
                global.io.to('admin').emit('request_updated', eventData);
            }

            return appointment;
        } catch (error) {
            logger.error('RequestService.rejectRequest error:', error);
            throw error;
        }
    }

    /**
     * Reschedule a request
     * @param {String} id - Appointment ID
     * @param {Object} data - Reschedule data
     * @param {Object} user - Current user object
     * @returns {Promise<Object>} - Updated appointment
     */
    static async rescheduleRequest(id, data, user) {
        try {
            const { newPreferredDate, newPreferredTime, reason } = data;

            if (!newPreferredDate || !newPreferredTime) {
                throw new Error('New preferred date and time are required');
            }

            if (!reason || reason.trim().length === 0) {
                throw new Error('Reschedule reason is required');
            }

            const appointment = await Visitor.findById(id);
            if (!appointment) {
                throw new Error('Appointment not found');
            }

            // Check permissions
            if (user.role === 'staff' && appointment.staffId?.toString() !== user._id.toString()) {
                throw new Error('Unauthorized access');
            }

            // Allow rescheduling to any date (past or future)
            const newDate = new Date(newPreferredDate);

            // Store old values
            const oldValues = {
                status: appointment.status,
                dateOfVisit: appointment.dateOfVisit,
                timeOfVisit: appointment.timeOfVisit,
            };

            // Update appointment
            appointment.status = 'rescheduled';
            appointment.dateOfVisit = newDate;
            appointment.timeOfVisit = newPreferredTime;
            appointment.rescheduleReason = reason;

            await appointment.save();

            // Notify visitor via email
            if (appointment.email) {
                const oldDateStr = oldValues.dateOfVisit
                    ? dayjs(oldValues.dateOfVisit).format('YYYY-MM-DD')
                    : 'N/A';
                const oldTimeStr = oldValues.timeOfVisit || 'N/A';
                const newDateStr = appointment.dateOfVisit
                    ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
                    : 'N/A';
                const newTimeStr = appointment.timeOfVisit || 'N/A';

                try {
                    const html = getAppointmentRescheduledTemplate(
                        appointment.name,
                        appointment.personToMeet,
                        oldDateStr,
                        oldTimeStr,
                        newDateStr,
                        newTimeStr,
                        reason
                    );
                    const emailSent = await sendEmail({
                        to: appointment.email,
                        subject: 'Appointment Rescheduled - Aditya University',
                        html
                    });
                    if (emailSent) {
                        logger.info('Reschedule email sent to visitor (requestService)', { visitorId: appointment._id, email: appointment.email });
                    } else {
                        logger.warn('Reschedule email failed for visitor (requestService)', { visitorId: appointment._id, email: appointment.email });
                    }
                } catch (err) {
                    logger.error('Failed to send reschedule email to visitor (requestService)', {
                        visitorId: appointment._id,
                        email: appointment.email,
                        error: err.message
                    });
                }
            }

            // Notify staff via email
            if (appointment.staffId && appointment.staffId.email) {
                const oldDateStr = oldValues.dateOfVisit
                    ? dayjs(oldValues.dateOfVisit).format('YYYY-MM-DD')
                    : 'N/A';
                const oldTimeStr = oldValues.timeOfVisit || 'N/A';
                const newDateStr = appointment.dateOfVisit
                    ? dayjs(appointment.dateOfVisit).format('YYYY-MM-DD')
                    : 'N/A';
                const newTimeStr = appointment.timeOfVisit || 'N/A';

                const staffHtml = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #0F172A; margin-top: 0;">Appointment Rescheduled</h2>
                  <p>The appointment with <strong>${appointment.name}</strong> (${appointment.contactNumber || 'N/A'}) has been rescheduled.</p>
                  <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <p style="margin: 8px 0;"><strong>Visitor:</strong> ${appointment.name}</p>
                    <p style="margin: 8px 0;"><strong>Contact:</strong> ${appointment.contactNumber || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Previous Schedule:</strong> ${oldDateStr} at ${oldTimeStr}</p>
                    <p style="margin: 8px 0;"><strong>New Schedule:</strong> ${newDateStr} at ${newTimeStr}</p>
                    <p style="margin: 8px 0;"><strong>Reason:</strong> ${reason}</p>
                  </div>
                  <p>Please update your calendar accordingly.</p>
                </div>
                `;

                try {
                    const emailSent = await sendEmail({
                        to: appointment.staffId.email,
                        subject: 'Appointment Rescheduled - Aditya University',
                        html: staffHtml
                    });
                    if (emailSent) {
                        logger.info('Reschedule email sent to staff (requestService)', { staffId: appointment.staffId._id, email: appointment.staffId.email });
                    } else {
                        logger.warn('Reschedule email failed for staff (requestService)', { staffId: appointment.staffId._id, email: appointment.staffId.email });
                    }
                } catch (err) {
                    logger.error('Failed to send reschedule email to staff (requestService)', {
                        staffId: appointment.staffId._id,
                        email: appointment.staffId.email,
                        error: err.message
                    });
                }
            }

            // Create audit log
            await AppointmentLog.create({
                appointmentId: appointment._id,
                action: 'RESCHEDULED',
                performedBy: user._id,
                performedByRole: user.role,
                oldValues,
                newValues: {
                    status: 'rescheduled',
                    dateOfVisit: newDate,
                    timeOfVisit: newPreferredTime,
                },
                reason,
                ipAddress: data.ipAddress,
            });

            // Emit Socket.io event
            if (global.io) {
                const eventData = {
                    id: appointment._id,
                    newPreferredDate: newDate,
                    newPreferredTime: newPreferredTime,
                    appointmentSummary: {
                        visitorName: appointment.name,
                        purpose: appointment.purposeOfVisit,
                    },
                };

                if (appointment.staffId) {
                    global.io.to(`staff:${appointment.staffId}`).emit('request_rescheduled', eventData);
                }
                global.io.to('admin').emit('request_rescheduled', eventData);
            }

            return appointment;
        } catch (error) {
            logger.error('RequestService.rescheduleRequest error:', error);
            throw error;
        }
    }

    /**
     * Bulk action on requests
     * @param {Object} data - Bulk action data
     * @param {Object} user - Current user object
     * @returns {Promise<Object>} - Bulk action results
     */
    static async bulkAction(data, user) {
        try {
            const { action, appointmentIds, reason, scheduledStart } = data;

            if (!action || !['APPROVE', 'REJECT'].includes(action)) {
                throw new Error('Invalid action. Must be APPROVE or REJECT');
            }

            if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
                throw new Error('Appointment IDs are required');
            }

            if (appointmentIds.length > 200) {
                throw new Error('Maximum 200 appointments can be processed at once');
            }

            if (action === 'REJECT' && (!reason || reason.trim().length === 0)) {
                throw new Error('Reason is required for bulk rejection');
            }

            const results = {
                total: appointmentIds.length,
                successCount: 0,
                failCount: 0,
                failures: [],
            };

            // Process each appointment
            for (const id of appointmentIds) {
                try {
                    const appointment = await Visitor.findById(id);

                    if (!appointment) {
                        results.failures.push({ id, error: 'Appointment not found' });
                        results.failCount++;
                        continue;
                    }

                    // Check permissions
                    if (user.role === 'staff' && appointment.staffId?.toString() !== user._id.toString()) {
                        results.failures.push({ id, error: 'Unauthorized access' });
                        results.failCount++;
                        continue;
                    }

                    // Validate status
                    if (!appointment.canBeModified()) {
                        results.failures.push({ id, error: `Cannot modify appointment with status: ${appointment.status}` });
                        results.failCount++;
                        continue;
                    }

                    const oldStatus = appointment.status;

                    if (action === 'APPROVE') {
                        appointment.status = 'APPROVED';
                        if (scheduledStart) {
                            appointment.scheduledStart = new Date(scheduledStart);
                        }
                    } else if (action === 'REJECT') {
                        appointment.status = 'REJECTED';
                        appointment.rejectionReason = reason;
                    }

                    appointment.updatedBy = user._id;
                    await appointment.save();

                    // Create audit log
                    await AppointmentLog.create({
                        appointmentId: appointment._id,
                        action: action === 'APPROVE' ? 'BULK_APPROVED' : 'BULK_REJECTED',
                        performedBy: user._id,
                        performedByRole: user.role,
                        oldValues: { status: oldStatus },
                        newValues: { status: appointment.status },
                        reason,
                        ipAddress: data.ipAddress,
                    });

                    results.successCount++;
                } catch (error) {
                    results.failures.push({ id, error: error.message });
                    results.failCount++;
                }
            }

            // Emit Socket.io event
            if (global.io) {
                const eventData = {
                    summary: results,
                    action,
                    performedBy: user.name,
                };

                if (user.role === 'staff') {
                    global.io.to(`staff:${user._id}`).emit('requests_bulk_updated', eventData);
                }
                global.io.to('admin').emit('requests_bulk_updated', eventData);
            }

            return results;
        } catch (error) {
            logger.error('RequestService.bulkAction error:', error);
            throw error;
        }
    }

    /**
     * Regenerate OTP for an appointment (Admin only)
     * @param {String} id - Appointment ID
     * @param {Object} user - Current user object
     * @returns {Promise<Object>} - New OTP (plaintext)
     */
    static async regenerateOTP(id, user) {
        try {
            if (user.role !== 'admin') {
                throw new Error('Only admins can regenerate OTP');
            }
            const appointment = await Visitor.findById(id);
            if (!appointment) {
                throw new Error('Appointment not found');
            }

            // Generate new OTP
            const otp = crypto.randomInt(100000, 999999).toString();
            const otpHash = hashOTP(otp);

            // Store old values
            const oldValues = {
                otpStatus: appointment.otpStatus,
                otpAttempts: appointment.otpAttempts,
            };

            // Update appointment
            appointment.otpHash = otpHash;
            appointment.otpStatus = 'OK';
            appointment.otpExpiresAt = dayjs().add(24, 'hours').toDate();
            appointment.otpAttempts = 0;
            appointment.updatedBy = user._id;

            await appointment.save();

            // Create audit log
            await AppointmentLog.create({
                appointmentId: appointment._id,
                action: 'OTP_REGENERATED',
                performedBy: user._id,
                performedByRole: user.role,
                oldValues,
                newValues: {
                    otpStatus: 'OK',
                    otpAttempts: 0,
                },
                metadata: {
                    otpExpiresAt: appointment.otpExpiresAt,
                },
            });

            logger.info(`OTP regenerated for appointment ${id} by admin ${user._id}`);

            // Return plaintext OTP (only to admin)
            return {
                otp,
                expiresAt: appointment.otpExpiresAt,
            };
        } catch (error) {
            logger.error('RequestService.regenerateOTP error:', error);
            throw error;
        }
    }
}

module.exports = RequestService;
