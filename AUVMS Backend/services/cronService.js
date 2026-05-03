const cron = require('node-cron');
const dayjs = require('dayjs');
const ScheduledReport = require('../models/ScheduledReport');
const reportService = require('./reportService');
const pdfGenerator = require('../utils/pdfGenerator');

/**
 * Initialize scheduled report cron jobs
 */
exports.initScheduledReports = () => {
    console.log('[CRON] Initializing scheduled reports...');

    // Daily reports - runs every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('[CRON] Running daily scheduled reports...');
        const reports = await ScheduledReport.find({
            isActive: true,
            schedule: 'daily',
        }).lean();

        for (const report of reports) {
            await processScheduledReport(report, 'daily');
        }
    });

    // Weekly reports - runs every Monday at 9 AM
    cron.schedule('0 9 * * 1', async () => {
        console.log('[CRON] Running weekly scheduled reports...');
        const reports = await ScheduledReport.find({
            isActive: true,
            schedule: 'weekly',
        }).lean();

        for (const report of reports) {
            await processScheduledReport(report, 'weekly');
        }
    });

    // Monthly reports - runs on 1st day of month at 9 AM
    cron.schedule('0 9 1 * *', async () => {
        console.log('[CRON] Running monthly scheduled reports...');
        const reports = await ScheduledReport.find({
            isActive: true,
            schedule: 'monthly',
        }).lean();

        for (const report of reports) {
            await processScheduledReport(report, 'monthly');
        }
    });

    console.log('[CRON] Scheduled reports initialized successfully');
};

/**
 * Process a scheduled report
 */
async function processScheduledReport(report, scheduleType) {
    try {
        console.log(`[CRON] Processing ${scheduleType} ${report.reportType} report...`);

        // Calculate date range based on schedule type
        const dateRange = calculateDateRange(scheduleType);

        let pdfBuffer, summary;

        // Generate report based on type
        if (report.reportType === 'VISITOR') {
            const visitors = await reportService.fetchVisitorData(dateRange.startDate, dateRange.endDate);
            summary = reportService.calculateVisitorSummary(visitors);
            pdfBuffer = await pdfGenerator.generateVisitorReport(visitors, dateRange, summary);
        } else if (report.reportType === 'APPOINTMENT') {
            const appointments = await reportService.fetchAppointmentData(dateRange.startDate, dateRange.endDate);
            summary = reportService.calculateAppointmentSummary(appointments);
            pdfBuffer = await pdfGenerator.generateAppointmentReport(appointments, dateRange, summary);
        } else {
            console.log(`[CRON] Report type ${report.reportType} not yet implemented`);
            return;
        }

        // Send email to recipients
        if (report.emails && report.emails.length > 0) {
            await reportService.sendReportEmail(report.emails, pdfBuffer, report.reportType, dateRange);
            console.log(`[CRON] Report emailed to ${report.emails.join(', ')}`);
        }

        // Update lastRun timestamp
        await ScheduledReport.findByIdAndUpdate(report._id, {
            lastRun: new Date(),
            nextRun: calculateNextRun(scheduleType),
        });

        console.log(`[CRON] ${report.reportType} report processed successfully`);
    } catch (error) {
        console.error(`[CRON] Failed to process scheduled report:`, error);
        // TODO: Add error logging to database
        // TODO: Add retry logic with exponential backoff
    }
}

/**
 * Calculate date range based on schedule type
 */
function calculateDateRange(scheduleType) {
    const now = dayjs();

    if (scheduleType === 'daily') {
        // Yesterday's data
        const startDate = now.subtract(1, 'day').startOf('day').toDate();
        const endDate = now.subtract(1, 'day').endOf('day').toDate();
        return { startDate, endDate };
    } else if (scheduleType === 'weekly') {
        // Last week (Monday to Sunday)
        const startDate = now.subtract(1, 'week').startOf('week').toDate();
        const endDate = now.subtract(1, 'week').endOf('week').toDate();
        return { startDate, endDate };
    } else if (scheduleType === 'monthly') {
        // Last month
        const startDate = now.subtract(1, 'month').startOf('month').toDate();
        const endDate = now.subtract(1, 'month').endOf('month').toDate();
        return { startDate, endDate };
    }

    // Default to yesterday
    const startDate = now.subtract(1, 'day').startOf('day').toDate();
    const endDate = now.subtract(1, 'day').endOf('day').toDate();
    return { startDate, endDate };
}

/**
 * Calculate next run time
 */
function calculateNextRun(scheduleType) {
    const now = dayjs();

    if (scheduleType === 'daily') {
        return now.add(1, 'day').hour(9).minute(0).second(0).toDate();
    } else if (scheduleType === 'weekly') {
        return now.add(1, 'week').day(1).hour(9).minute(0).second(0).toDate();
    } else if (scheduleType === 'monthly') {
        return now.add(1, 'month').date(1).hour(9).minute(0).second(0).toDate();
    }

    return now.add(1, 'day').hour(9).minute(0).second(0).toDate();
}

// TODO: Add retry logic for failed report generation
// TODO: Add report generation queue for large datasets
// TODO: Add S3 upload for report archiving
// TODO: Add configurable cron schedules (custom times)
