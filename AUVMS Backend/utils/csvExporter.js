const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs').promises;
const dayjs = require('dayjs');

/**
 * CSV Exporter Utility for Appointments
 * Handles streaming CSV generation for large datasets
 */

class CsvExporter {
    /**
     * Generate CSV file from appointment data
     * @param {Array} appointments - Array of appointment objects
     * @param {String} filename - Optional filename (auto-generated if not provided)
     * @returns {Promise<String>} - Path to generated CSV file
     */
    static async exportAppointments(appointments, filename = null) {
        try {
            // Generate filename if not provided
            if (!filename) {
                const timestamp = dayjs().format('YYYYMMDD_HHmmss');
                filename = `appointments_${timestamp}.csv`;
            }

            // Ensure uploads directory exists
            const uploadsDir = path.join(__dirname, '../uploads');
            await fs.mkdir(uploadsDir, { recursive: true });

            const filePath = path.join(uploadsDir, filename);

            // Define CSV headers
            const csvWriter = createObjectCsvWriter({
                path: filePath,
                header: [
                    { id: 'appointmentId', title: 'Appointment ID' },
                    { id: 'visitorName', title: 'Visitor Name' },
                    { id: 'visitorEmail', title: 'Visitor Email' },
                    { id: 'visitorPhone', title: 'Visitor Phone' },
                    { id: 'staffName', title: 'Staff Name' },
                    { id: 'departmentName', title: 'Department' },
                    { id: 'purpose', title: 'Purpose' },
                    { id: 'preferredDate', title: 'Preferred Date' },
                    { id: 'preferredTime', title: 'Preferred Time' },
                    { id: 'status', title: 'Status' },
                    { id: 'scheduledStart', title: 'Scheduled Start' },
                    { id: 'scheduledEnd', title: 'Scheduled End' },
                    { id: 'otpStatus', title: 'OTP Status' },
                    { id: 'createdAt', title: 'Created At' },
                    { id: 'updatedAt', title: 'Updated At' },
                ],
            });

            // Transform appointments data for CSV
            const records = appointments.map((apt) => ({
                appointmentId: apt.appointmentId || `APT-${apt._id.toString().slice(-8).toUpperCase()}`,
                visitorName: apt.visitorName || '',
                visitorEmail: apt.visitorEmail || '',
                visitorPhone: apt.visitorPhone || '',
                staffName: apt.staffName || apt.personToMeet || '',
                departmentName: apt.departmentId?.name || '',
                purpose: apt.purpose || '',
                preferredDate: apt.preferredDate ? dayjs(apt.preferredDate).format('YYYY-MM-DD') : '',
                preferredTime: apt.preferredTime || '',
                status: apt.status || '',
                scheduledStart: apt.scheduledStart ? dayjs(apt.scheduledStart).format('YYYY-MM-DD HH:mm') : '',
                scheduledEnd: apt.scheduledEnd ? dayjs(apt.scheduledEnd).format('YYYY-MM-DD HH:mm') : '',
                otpStatus: apt.otpStatus || 'NOT_GENERATED',
                createdAt: apt.createdAt ? dayjs(apt.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                updatedAt: apt.updatedAt ? dayjs(apt.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '',
            }));

            // Write records to CSV
            await csvWriter.writeRecords(records);

            return filePath;
        } catch (error) {
            throw new Error(`CSV Export failed: ${error.message}`);
        }
    }

    /**
     * Generate CSV stream for large datasets (memory efficient)
     * @param {Query} query - Mongoose query object
     * @param {Object} res - Express response object
     * @param {String} filename - CSV filename
     */
    static async streamAppointmentsCsv(query, res, filename) {
        try {
            const timestamp = dayjs().format('YYYYMMDD_HHmmss');
            const csvFilename = filename || `appointments_${timestamp}.csv`;

            // Set response headers
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${csvFilename}"`);

            // Write CSV header
            const header = [
                'Appointment ID',
                'Visitor Name',
                'Visitor Email',
                'Visitor Phone',
                'Staff Name',
                'Department',
                'Purpose',
                'Preferred Date',
                'Preferred Time',
                'Status',
                'Scheduled Start',
                'Scheduled End',
                'OTP Status',
                'Created At',
                'Updated At',
            ].join(',');

            res.write(header + '\n');

            // Stream data in chunks
            const cursor = query.cursor();

            for await (const apt of cursor) {
                const row = [
                    apt.appointmentId || `APT-${apt._id.toString().slice(-8).toUpperCase()}`,
                    this.escapeCsvValue(apt.visitorName || ''),
                    this.escapeCsvValue(apt.visitorEmail || ''),
                    this.escapeCsvValue(apt.visitorPhone || ''),
                    this.escapeCsvValue(apt.staffName || apt.personToMeet || ''),
                    this.escapeCsvValue(apt.departmentId?.name || ''),
                    this.escapeCsvValue(apt.purpose || ''),
                    apt.preferredDate ? dayjs(apt.preferredDate).format('YYYY-MM-DD') : '',
                    this.escapeCsvValue(apt.preferredTime || ''),
                    apt.status || '',
                    apt.scheduledStart ? dayjs(apt.scheduledStart).format('YYYY-MM-DD HH:mm') : '',
                    apt.scheduledEnd ? dayjs(apt.scheduledEnd).format('YYYY-MM-DD HH:mm') : '',
                    apt.otpStatus || 'NOT_GENERATED',
                    apt.createdAt ? dayjs(apt.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                    apt.updatedAt ? dayjs(apt.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '',
                ].join(',');

                res.write(row + '\n');
            }

            res.end();
        } catch (error) {
            throw new Error(`CSV Streaming failed: ${error.message}`);
        }
    }

    /**
     * Escape CSV values to handle commas, quotes, and newlines
     * @param {String} value - Value to escape
     * @returns {String} - Escaped value
     */
    static escapeCsvValue(value) {
        if (!value) return '';

        const stringValue = String(value);

        // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
    }

    /**
     * Delete old CSV files (cleanup)
     * @param {Number} olderThanDays - Delete files older than X days
     */
    static async cleanupOldCsvFiles(olderThanDays = 7) {
        try {
            const uploadsDir = path.join(__dirname, '../uploads');
            const files = await fs.readdir(uploadsDir);

            const cutoffDate = dayjs().subtract(olderThanDays, 'days');

            for (const file of files) {
                if (file.startsWith('appointments_') && file.endsWith('.csv')) {
                    const filePath = path.join(uploadsDir, file);
                    const stats = await fs.stat(filePath);

                    if (dayjs(stats.mtime).isBefore(cutoffDate)) {
                        await fs.unlink(filePath);
                    }
                }
            }
        } catch (error) {
            console.error('CSV cleanup error:', error.message);
        }
    }
}

module.exports = CsvExporter;
