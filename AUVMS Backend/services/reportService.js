const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment');
const EmailConfig = require('../models/EmailConfig');
const dayjs = require('dayjs');
const nodemailer = require('nodemailer');
const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'aditya-vms-default-secret-key';

/**
 * Fetch visitor data for a date range
 */
exports.fetchVisitorData = async (startDate, endDate) => {
    const visitors = await Visitor.find({
        checkInAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        },
    })
        .sort({ checkInAt: -1 })
        .lean();

    return visitors;
};

/**
 * Fetch appointment data for a date range
 */
exports.fetchAppointmentData = async (startDate, endDate) => {
    const appointments = await Appointment.find({
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
        },
    })
        .populate('staffMember', 'name department')
        .sort({ createdAt: -1 })
        .lean();

    return appointments;
};

/**
 * Calculate visitor summary statistics
 */
exports.calculateVisitorSummary = (visitors) => {
    const total = visitors.length;
    const activeCheckIns = visitors.filter((v) => v.status === 'checked-in').length;
    const completedVisits = visitors.filter((v) => v.status === 'checked-out').length;

    // Calculate average visit duration (in minutes)
    let totalDuration = 0;
    let countWithDuration = 0;
    visitors.forEach((v) => {
        if (v.checkInAt && v.checkOutAt) {
            const duration = dayjs(v.checkOutAt).diff(dayjs(v.checkInAt), 'minute');
            totalDuration += duration;
            countWithDuration++;
        }
    });
    const avgVisitDuration = countWithDuration > 0 ? Math.round(totalDuration / countWithDuration) : 0;

    // Find peak hour (hour with most check-ins)
    const hourCounts = {};
    visitors.forEach((v) => {
        if (v.checkInAt) {
            const hour = dayjs(v.checkInAt).hour();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
    });
    let peakHour = 'N/A';
    let maxCount = 0;
    Object.keys(hourCounts).forEach((hour) => {
        if (hourCounts[hour] > maxCount) {
            maxCount = hourCounts[hour];
            const h = parseInt(hour);
            peakHour = `${h}:00 - ${h + 1}:00`;
        }
    });

    // Find most visited department
    const deptCounts = {};
    visitors.forEach((v) => {
        if (v.department) {
            deptCounts[v.department] = (deptCounts[v.department] || 0) + 1;
        }
    });
    let topDepartment = 'N/A';
    let maxDeptCount = 0;
    Object.keys(deptCounts).forEach((dept) => {
        if (deptCounts[dept] > maxDeptCount) {
            maxDeptCount = deptCounts[dept];
            topDepartment = dept;
        }
    });

    return {
        totalVisitors: total,
        activeCheckIns,
        completedVisits,
        avgVisitDuration,
        peakHour,
        topDepartment,
    };
};

/**
 * Calculate appointment summary statistics
 */
exports.calculateAppointmentSummary = (appointments) => {
    const total = appointments.length;
    const approved = appointments.filter((a) => a.status === 'approved').length;
    const rejected = appointments.filter((a) => a.status === 'denied' || a.status === 'rejected').length;
    const pending = appointments.filter((a) => a.status === 'pending').length;

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    // Calculate average processing time (createdAt to updatedAt for non-pending)
    let totalProcessingTime = 0;
    let countProcessed = 0;
    appointments.forEach((a) => {
        if (a.status !== 'pending' && a.createdAt && a.updatedAt) {
            const processingTime = dayjs(a.updatedAt).diff(dayjs(a.createdAt), 'hour', true);
            totalProcessingTime += processingTime;
            countProcessed++;
        }
    });
    const avgProcessingTime = countProcessed > 0 ? (totalProcessingTime / countProcessed).toFixed(1) : 0;

    return {
        totalRequests: total,
        approved,
        rejected,
        pending,
        approvalRate,
        rejectionRate,
        avgProcessingTime,
    };
};

/**
 * Send report via email
 */
exports.sendReportEmail = async (recipients, pdfBuffer, reportType, dateRange) => {
    try {
        // Fetch email configuration
        const emailConfig = await EmailConfig.findOne().sort({ createdAt: -1 });

        if (!emailConfig) {
            throw new Error('Email configuration not found. Please configure SMTP settings first.');
        }

        // Decrypt password
        const decryptedPassword = decryptPassword(emailConfig.authenticationPassword);

        // Create transporter
        const transporter = nodemailer.createTransporter({
            host: emailConfig.smtpHost,
            port: emailConfig.smtpPort,
            secure: emailConfig.smtpPort === 465, // true for 465, false for other ports
            auth: {
                user: emailConfig.authenticationEmail,
                pass: decryptedPassword,
            },
        });

        // Email options
        const mailOptions = {
            from: `"${emailConfig.senderName}" <${emailConfig.senderEmail}>`,
            to: recipients.join(', '),
            subject: `${reportType} Report - ${dayjs(dateRange.startDate).format('MMM DD')} to ${dayjs(dateRange.endDate).format('MMM DD, YYYY')}`,
            text: `Please find the attached ${reportType} report for the period ${dayjs(dateRange.startDate).format('MMM DD, YYYY')} to ${dayjs(dateRange.endDate).format('MMM DD, YYYY')}.`,
            html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Aditya University Visitor Management System</h2>
          <p>Dear Administrator,</p>
          <p>Please find the attached <strong>${reportType}</strong> report for the period:</p>
          <p><strong>${dayjs(dateRange.startDate).format('MMM DD, YYYY')}</strong> to <strong>${dayjs(dateRange.endDate).format('MMM DD, YYYY')}</strong></p>
          <p>This report was automatically generated by the system.</p>
          <br/>
          <p>Best regards,<br/>AUVMS Team</p>
        </div>
      `,
            attachments: [
                {
                    filename: `${reportType.toLowerCase()}_report_${dayjs().format('YYYYMMDD')}.pdf`,
                    content: pdfBuffer,
                },
            ],
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Report email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send report email:', error);
        throw error;
    }
};

/**
 * Encrypt password
 */
function encryptPassword(password) {
    return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
}

/**
 * Decrypt password
 */
function decryptPassword(encryptedPassword) {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

// Export encryption functions for use in controller
exports.encryptPassword = encryptPassword;
exports.decryptPassword = decryptPassword;

// TODO: Add retry logic for failed email sends
// TODO: Add email logging/audit trail
// TODO: Add support for multiple attachments
// TODO: Add HTML email templates
