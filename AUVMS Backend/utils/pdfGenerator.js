const PDFDocument = require('pdfkit');
const path = require('path');
const dayjs = require('dayjs');

/**
 * Generate a Visitor Report PDF
 * @param {Array} visitors - Array of visitor data
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} summary - Summary statistics
 * @returns {Promise<Buffer>} PDF buffer
 */
exports.generateVisitorReport = (visitors, dateRange, summary) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // Header
            addReportHeader(doc, 'Visitor Report', dateRange);

            // Table
            addVisitorTable(doc, visitors);

            // Summary
            addVisitorSummary(doc, summary);

            // Footer
            addPageNumbers(doc);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generate an Appointment Report PDF
 * @param {Array} appointments - Array of appointment data
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} summary - Summary statistics
 * @returns {Promise<Buffer>} PDF buffer
 */
exports.generateAppointmentReport = (appointments, dateRange, summary) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // Header
            addReportHeader(doc, 'Appointment Report', dateRange);

            // Table
            addAppointmentTable(doc, appointments);

            // Summary
            addAppointmentSummary(doc, summary);

            // Footer
            addPageNumbers(doc);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

// ==================== HELPER FUNCTIONS ====================

function addReportHeader(doc, title, dateRange) {
    const { startDate, endDate } = dateRange;

    // University name and logo placeholder
    doc
        .fontSize(20)
        .fillColor('#1e40af')
        .text('Aditya University', { align: 'center' })
        .fontSize(12)
        .fillColor('#6b7280')
        .text('Visitor Management System', { align: 'center' })
        .moveDown(0.5);

    // Report title
    doc
        .fontSize(18)
        .fillColor('#111827')
        .text(title, { align: 'center', underline: true })
        .moveDown(0.5);

    // Date range
    doc
        .fontSize(10)
        .fillColor('#6b7280')
        .text(
            `Period: ${dayjs(startDate).format('MMM DD, YYYY')} - ${dayjs(endDate).format('MMM DD, YYYY')}`,
            { align: 'center' }
        )
        .text(`Generated on: ${dayjs().format('MMM DD, YYYY HH:mm A')}`, { align: 'center' })
        .moveDown(1.5);

    // Divider line
    doc
        .strokeColor('#d1d5db')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);
}

function addVisitorTable(doc, visitors) {
    const tableTop = doc.y;
    const colWidths = [80, 120, 80, 100, 80, 80];
    const headers = ['Pass ID', 'Name', 'Contact', 'Purpose', 'Check In', 'Status'];

    // Table headers
    doc.fontSize(10).fillColor('#1f2937').font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
    });

    doc.moveDown(0.5);
    doc
        .strokeColor('#d1d5db')
        .lineWidth(0.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

    // Table rows
    doc.font('Helvetica').fontSize(9).fillColor('#374151');

    visitors.slice(0, 50).forEach((visitor, index) => {
        doc.moveDown(0.3);
        const rowY = doc.y;

        xPos = 50;
        const rowData = [
            visitor.visitorPassId || 'N/A',
            visitor.name || 'N/A',
            visitor.contactNumber || 'N/A',
            (visitor.purposeOfVisit || 'N/A').slice(0, 20),
            visitor.checkInAt ? dayjs(visitor.checkInAt).format('MMM DD HH:mm') : 'N/A',
            visitor.status || 'N/A',
        ];

        rowData.forEach((data, i) => {
            doc.text(data, xPos, rowY, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
        });

        // Check if we need a new page
        if (doc.y > 700) {
            doc.addPage();
        }
    });

    if (visitors.length > 50) {
        doc.moveDown(0.5).fontSize(8).fillColor('#6b7280')
            .text(`Note: Showing first 50 of ${visitors.length} total visitors`, { align: 'center' });
    }

    doc.moveDown(1);
}

function addAppointmentTable(doc, appointments) {
    const tableTop = doc.y;
    const colWidths = [70, 100, 100, 80, 80, 80];
    const headers = ['ID', 'Visitor', 'Staff', 'Department', 'Status', 'Created'];

    // Table headers
    doc.fontSize(10).fillColor('#1f2937').font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
    });

    doc.moveDown(0.5);
    doc
        .strokeColor('#d1d5db')
        .lineWidth(0.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

    // Table rows
    doc.font('Helvetica').fontSize(9).fillColor('#374151');

    appointments.slice(0, 50).forEach((apt, index) => {
        doc.moveDown(0.3);
        const rowY = doc.y;

        xPos = 50;
        const rowData = [
            apt._id ? apt._id.toString().slice(-6) : 'N/A',
            apt.visitorName || apt.visitor?.name || 'N/A',
            apt.staffMember?.name || 'N/A',
            apt.staffMember?.department || 'N/A',
            apt.status || 'N/A',
            apt.createdAt ? dayjs(apt.createdAt).format('MMM DD') : 'N/A',
        ];

        rowData.forEach((data, i) => {
            doc.text(data, xPos, rowY, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
        });

        // Check if we need a new page
        if (doc.y > 700) {
            doc.addPage();
        }
    });

    if (appointments.length > 50) {
        doc.moveDown(0.5).fontSize(8).fillColor('#6b7280')
            .text(`Note: Showing first 50 of ${appointments.length} total appointments`, { align: 'center' });
    }

    doc.moveDown(1);
}

function addVisitorSummary(doc, summary) {
    doc
        .fontSize(14)
        .fillColor('#1f2937')
        .font('Helvetica-Bold')
        .text('Summary Statistics', { underline: true })
        .moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#374151');

    doc.text(`Total Visitors: ${summary.totalVisitors || 0}`);
    doc.text(`Average Visit Duration: ${summary.avgVisitDuration || 0} minutes`);
    doc.text(`Peak Hour: ${summary.peakHour || 'N/A'}`);
    doc.text(`Most Visited Department: ${summary.topDepartment || 'N/A'}`);
    doc.text(`Active Check-ins: ${summary.activeCheckIns || 0}`);
    doc.text(`Completed Visits: ${summary.completedVisits || 0}`);
}

function addAppointmentSummary(doc, summary) {
    doc
        .fontSize(14)
        .fillColor('#1f2937')
        .font('Helvetica-Bold')
        .text('Summary Statistics', { underline: true })
        .moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#374151');

    doc.text(`Total Requests: ${summary.totalRequests || 0}`);
    doc.text(`Approved: ${summary.approved || 0} (${summary.approvalRate || 0}%)`);
    doc.text(`Rejected: ${summary.rejected || 0} (${summary.rejectionRate || 0}%)`);
    doc.text(`Pending: ${summary.pending || 0}`);
    doc.text(`Average Processing Time: ${summary.avgProcessingTime || 0} hours`);
}

function addPageNumbers(doc) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
            .fontSize(8)
            .fillColor('#9ca3af')
            .text(
                `Page ${i + 1} of ${pages.count}`,
                50,
                doc.page.height - 30,
                { align: 'center' }
            );
    }
}

// TODO: Add logo image support
// TODO: Add chart/graph embedding in PDF
// TODO: Add custom styling/branding options
