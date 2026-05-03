const createError = require('http-errors');
const { createObjectCsvWriter } = require('csv-writer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment');
const ScheduledReport = require('../models/ScheduledReport');
const EmailConfig = require('../models/EmailConfig');
const reportService = require('../services/reportService');
const pdfGenerator = require('../utils/pdfGenerator');

// ==================== EXISTING ENDPOINTS ====================

exports.dailyReport = async (_req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const total = await Visitor.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const checkedIn = await Visitor.countDocuments({ status: 'checked-in', createdAt: { $gte: start, $lte: end } });
    const checkedOut = await Visitor.countDocuments({ status: 'checked-out', createdAt: { $gte: start, $lte: end } });
    res.json({ date: start.toISOString().slice(0, 10), total, checkedIn, checkedOut });
  } catch (err) {
    next(err);
  }
};

exports.monthlyReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month ? parseInt(month, 10) - 1 : now.getMonth();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const grouped = await Visitor.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
          checkedOut: { $sum: { $cond: [{ $eq: ['$status', 'checked-out'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(grouped.map((g) => ({ date: g._id, total: g.total, checkedIn: g.checkedIn, checkedOut: g.checkedOut })));
  } catch (err) {
    next(err);
  }
};

exports.exportLogs = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;
    const logs = await Visitor.find().sort({ createdAt: -1 }).lean();

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Visitors');
      sheet.columns = [
        { header: 'Visitor Pass ID', key: 'visitorPassId', width: 22 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Contact', key: 'contactNumber', width: 16 },
        { header: 'Email', key: 'email', width: 22 },
        { header: 'Purpose', key: 'purposeOfVisit', width: 24 },
        { header: 'Person To Meet', key: 'personToMeet', width: 22 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Check In', key: 'checkInAt', width: 24 },
        { header: 'Check Out', key: 'checkOutAt', width: 24 },
        { header: 'Created At', key: 'createdAt', width: 24 },
      ];
      sheet.addRows(
        logs.map((l) => ({
          ...l,
          checkInAt: l.checkInAt ? new Date(l.checkInAt).toISOString() : '',
          checkOutAt: l.checkOutAt ? new Date(l.checkOutAt).toISOString() : '',
          createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
        }))
      );
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="visitor_logs.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    const exportDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const filePath = path.join(exportDir, `visitor_logs_${Date.now()}.csv`);
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'visitorPassId', title: 'Visitor Pass ID' },
        { id: 'name', title: 'Name' },
        { id: 'contactNumber', title: 'Contact' },
        { id: 'email', title: 'Email' },
        { id: 'purposeOfVisit', title: 'Purpose' },
        { id: 'personToMeet', title: 'Person To Meet' },
        { id: 'status', title: 'Status' },
        { id: 'checkInAt', title: 'Check In' },
        { id: 'checkOutAt', title: 'Check Out' },
        { id: 'createdAt', title: 'Created At' },
      ],
    });

    await csvWriter.writeRecords(
      logs.map((l) => ({
        ...l,
        checkInAt: l.checkInAt ? new Date(l.checkInAt).toISOString() : '',
        checkOutAt: l.checkOutAt ? new Date(l.checkOutAt).toISOString() : '',
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
      }))
    );
    res.download(filePath);
  } catch (err) {
    next(err);
  }
};

// ==================== NEW ENDPOINTS ====================

/**
 * Generate Report (Manual PDF/Excel)
 * POST /api/reports/generate
 */
exports.generateReport = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate, exportFormat } = req.body;

    // Validation
    if (!reportType || !startDate || !endDate) {
      return next(createError(400, 'reportType, startDate, and endDate are required'));
    }

    if (!['VISITOR', 'APPOINTMENT', 'USER_ACTIVITY'].includes(reportType)) {
      return next(createError(400, 'Invalid reportType'));
    }

    if (!['PDF', 'EXCEL'].includes(exportFormat)) {
      return next(createError(400, 'Invalid exportFormat. Use PDF or EXCEL'));
    }

    const dateRange = { startDate, endDate };

    // Generate report based on type and format
    if (reportType === 'VISITOR') {
      const visitors = await reportService.fetchVisitorData(startDate, endDate);
      const summary = reportService.calculateVisitorSummary(visitors);

      if (exportFormat === 'PDF') {
        const pdfBuffer = await pdfGenerator.generateVisitorReport(visitors, dateRange, summary);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="visitor_report_${Date.now()}.pdf"`);
        res.send(pdfBuffer);
      } else {
        // Excel export for visitors (existing logic can be reused)
        return next(createError(501, 'Excel export not yet implemented for this endpoint. Use /api/reports/export'));
        // TODO: Implement Excel export here
      }
    } else if (reportType === 'APPOINTMENT') {
      const appointments = await reportService.fetchAppointmentData(startDate, endDate);
      const summary = reportService.calculateAppointmentSummary(appointments);

      if (exportFormat === 'PDF') {
        const pdfBuffer = await pdfGenerator.generateAppointmentReport(appointments, dateRange, summary);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="appointment_report_${Date.now()}.pdf"`);
        res.send(pdfBuffer);
      } else {
        return next(createError(501, 'Excel export for appointments not yet implemented'));
        // TODO: Implement Excel export for appointments
      }
    } else {
      return next(createError(501, 'USER_ACTIVITY report not yet implemented'));
      // TODO: Implement USER_ACTIVITY report
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Schedule Report
 * POST /api/reports/schedule
 */
exports.scheduleReport = async (req, res, next) => {
  try {
    const { email, reportType, schedule, time } = req.body;

    // Validation
    if (!email || !Array.isArray(email) || email.length === 0) {
      return next(createError(400, 'email array is required'));
    }
    if (!reportType || !['VISITOR', 'APPOINTMENT', 'USER_ACTIVITY'].includes(reportType)) {
      return next(createError(400, 'Invalid reportType'));
    }
    if (!schedule || !['daily', 'weekly', 'monthly'].includes(schedule)) {
      return next(createError(400, 'Invalid schedule. Use daily, weekly, or monthly'));
    }

    // Create scheduled report
    const scheduledReport = await ScheduledReport.create({
      reportType,
      schedule,
      time: time || '09:00',
      emails: email,
      createdBy: req.user._id,
      isActive: true,
    });

    res.json({
      success: true,
      data: scheduledReport,
      message: 'Report scheduled successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Scheduled Reports List
 * GET /api/reports/scheduled
 */
exports.getScheduledReports = async (req, res, next) => {
  try {
    const reports = await ScheduledReport.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: reports,
      message: 'Scheduled reports fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Email Configuration
 * GET /api/reports/email-config
 */
exports.getEmailConfig = async (req, res, next) => {
  try {
    const config = await EmailConfig.findOne().sort({ createdAt: -1 }).lean();

    if (!config) {
      return res.json({
        success: true,
        data: null,
        message: 'No email configuration found',
      });
    }

    // Remove password from response
    const { authenticationPassword, ...safeConfig } = config;

    res.json({
      success: true,
      data: safeConfig,
      message: 'Email configuration fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Save Email Configuration
 * PUT /api/reports/email-config
 */
exports.saveEmailConfig = async (req, res, next) => {
  try {
    const { smtpHost, smtpPort, senderEmail, senderName, authenticationEmail, authenticationPassword } = req.body;

    // Validation
    if (!smtpHost || !smtpPort || !senderEmail || !senderName || !authenticationEmail || !authenticationPassword) {
      return next(createError(400, 'All email configuration fields are required'));
    }

    // Encrypt password
    const encryptedPassword = reportService.encryptPassword(authenticationPassword);

    // Update or create configuration
    const config = await EmailConfig.findOneAndUpdate(
      {},
      {
        smtpHost,
        smtpPort: parseInt(smtpPort),
        senderEmail,
        senderName,
        authenticationEmail,
        authenticationPassword: encryptedPassword,
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: { id: config._id },
      message: 'Email configuration saved successfully',
    });
  } catch (err) {
    next(err);
  }
};

// TODO: Add report logs endpoint for audit trail
// TODO: Add Excel export support for all report types
// TODO: Add batch report generation
