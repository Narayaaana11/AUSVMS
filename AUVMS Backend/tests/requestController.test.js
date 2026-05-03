const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const requestRoutes = require('../routes/requestRoutes');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/api/requests', requestRoutes);

// Error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        success: false,
        message: err.message
    });
});

describe('Request Controller API Endpoints', () => {
    let adminToken, staffToken1, staffToken2;
    let adminUser, staffUser1, staffUser2;
    let testAppointments;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Create users
        adminUser = await User.create({
            name: 'Admin',
            email: 'admin@test.com',
            role: 'admin',
            password: 'password123'
        });

        staffUser1 = await User.create({
            name: 'Staff 1',
            email: 'staff1@test.com',
            role: 'staff',
            password: 'password123'
        });

        staffUser2 = await User.create({
            name: 'Staff 2',
            email: 'staff2@test.com',
            role: 'staff',
            password: 'password123'
        });

        // Generate tokens
        adminToken = jwt.sign(
            { _id: adminUser._id, role: 'admin' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        staffToken1 = jwt.sign(
            { _id: staffUser1._id, role: 'staff' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        staffToken2 = jwt.sign(
            { _id: staffUser2._id, role: 'staff' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Create test appointments
        testAppointments = await Appointment.create([
            {
                visitorName: 'Visitor 1',
                visitorEmail: 'visitor1@test.com',
                visitorPhone: '1111111111',
                personToMeet: 'Staff 1',
                staffId: staffUser1._id,
                staffName: staffUser1.name,
                purpose: 'Meeting',
                preferredDate: new Date('2025-12-15'),
                preferredTime: '10:00 AM',
                status: 'PENDING',
                otpStatus: 'NOT_GENERATED'
            },
            {
                visitorName: 'Visitor 2',
                visitorEmail: 'visitor2@test.com',
                visitorPhone: '2222222222',
                personToMeet: 'Staff 2',
                staffId: staffUser2._id,
                staffName: staffUser2.name,
                purpose: 'Consultation',
                preferredDate: new Date('2025-12-16'),
                preferredTime: '2:00 PM',
                status: 'PENDING',
                otpStatus: 'NOT_GENERATED'
            }
        ]);
    });

    afterEach(async () => {
        await Appointment.deleteMany({});
        await User.deleteMany({});
    });

    describe('GET /api/requests', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/requests');

            expect(res.status).toBe(401);
        });

        it('should return paginated results for admin', async () => {
            const res = await request(app)
                .get('/api/requests?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.requests).toHaveLength(2);
            expect(res.body.data.total).toBe(2);
        });

        it('should filter requests for staff user', async () => {
            const res = await request(app)
                .get('/api/requests')
                .set('Authorization', `Bearer ${staffToken1}`);

            expect(res.status).toBe(200);
            expect(res.body.data.requests).toHaveLength(1);
            expect(res.body.data.requests[0].staffId._id).toBe(staffUser1._id.toString());
        });

        it('should apply status filter', async () => {
            const res = await request(app)
                .get('/api/requests?status=PENDING')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.requests.every(r => r.status === 'PENDING')).toBe(true);
        });
    });

    describe('POST /api/requests/:id/approve', () => {
        it('should approve request with valid data', async () => {
            const appointment = testAppointments[0];

            const res = await request(app)
                .post(`/api/requests/${appointment._id}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ note: 'Approved' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('APPROVED');
        });

        it('should return 403 when staff tries to approve another staff\'s request', async () => {
            const appointment = testAppointments[1]; // Belongs to staffUser2

            const res = await request(app)
                .post(`/api/requests/${appointment._id}/approve`)
                .set('Authorization', `Bearer ${staffToken1}`)
                .send({});

            expect(res.status).toBe(403);
        });

        it('should return 400 for invalid status transition', async () => {
            // First approve it
            const appointment = testAppointments[0];
            await Appointment.findByIdAndUpdate(appointment._id, { status: 'APPROVED' });

            const res = await request(app)
                .post(`/api/requests/${appointment._id}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/requests/:id/reject', () => {
        it('should reject request with reason', async () => {
            const appointment = testAppointments[0];

            const res = await request(app)
                .post(`/api/requests/${appointment._id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Not available' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('REJECTED');
        });

        it('should return 400 without reason', async () => {
            const appointment = testAppointments[0];

            const res = await request(app)
                .post(`/api/requests/${appointment._id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: '' });

            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /api/requests/:id/reschedule', () => {
        it('should reschedule request', async () => {
            const appointment = testAppointments[0];

            const res = await request(app)
                .patch(`/api/requests/${appointment._id}/reschedule`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    newPreferredDate: '2025-12-20',
                    newPreferredTime: '3:00 PM',
                    reason: 'Reschedule needed'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('RESCHEDULED');
        });

        it('should return 400 for missing fields', async () => {
            const appointment = testAppointments[0];

            const res = await request(app)
                .patch(`/api/requests/${appointment._id}/reschedule`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Test' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/requests/bulk-action', () => {
        it('should handle bulk approve', async () => {
            const ids = testAppointments.map(a => a._id.toString());

            const res = await request(app)
                .post('/api/requests/bulk-action')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    action: 'APPROVE',
                    appointmentIds: ids
                });

            expect(res.status).toBe(200);
            expect(res.body.data.successCount).toBe(2);
        });

        it('should return 400 when exceeding 200 id limit', async () => {
            const ids = Array(201).fill(testAppointments[0]._id.toString());

            const res = await request(app)
                .post('/api/requests/bulk-action')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    action: 'APPROVE',
                    appointmentIds: ids
                });

            expect(res.status).toBe(400);
        });

        it('should return 400 for invalid action', async () => {
            const res = await request(app)
                .post('/api/requests/bulk-action')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    action: 'INVALID',
                    appointmentIds: [testAppointments[0]._id]
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/requests/export', () => {
        it('should stream CSV with correct headers', async () => {
            const res = await request(app)
                .get('/api/requests/export')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toContain('attachment');
        });

        it('should apply filters to export', async () => {
            const res = await request(app)
                .get('/api/requests/export?status=PENDING')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.text).toContain('Visitor 1');
            expect(res.text).toContain('Visitor 2');
        });
    });

    describe('POST /api/requests/:id/otp/regenerate', () => {
        it('should regenerate OTP for admin', async () => {
            const appointment = testAppointments[0];

            const res = await request(app)
                .post(`/api/requests/${appointment._id}/otp/regenerate`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.otp).toMatch(/^\d{6}$/);
        });

        it('should return 403 for non-admin', async () => {
            const appointment = testAppointments[0];

            const res = await request(app)
                .post(`/api/requests/${appointment._id}/otp/regenerate`)
                .set('Authorization', `Bearer ${staffToken1}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/requests/stats', () => {
        it('should return statistics for admin', async () => {
            const res = await request(app)
                .get('/api/requests/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.totalRequests).toBeDefined();
            expect(res.body.data.pendingRequests).toBe(2);
        });

        it('should return filtered statistics for staff', async () => {
            const res = await request(app)
                .get('/api/requests/stats')
                .set('Authorization', `Bearer ${staffToken1}`);

            expect(res.status).toBe(200);
            expect(res.body.data.totalRequests).toBe(1);
        });
    });
});
