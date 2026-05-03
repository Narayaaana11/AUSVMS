const mongoose = require('mongoose');
const RequestService = require('../services/requestService');
const Appointment = require('../models/Appointment');
const AppointmentLog = require('../models/AppointmentLog');
const User = require('../models/User');

describe('RequestService', () => {
    let adminUser, staffUser1, staffUser2, testAppointments;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Create test users
        adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'admin',
            password: 'password123'
        });

        staffUser1 = await User.create({
            name: 'Staff User 1',
            email: 'staff1@test.com',
            role: 'staff',
            password: 'password123'
        });

        staffUser2 = await User.create({
            name: 'Staff User 2',
            email: 'staff2@test.com',
            role: 'staff',
            password: 'password123'
        });

        // Create test appointments
        testAppointments = await Appointment.create([
            {
                visitorName: 'John Doe',
                visitorEmail: 'john@example.com',
                visitorPhone: '1234567890',
                personToMeet: 'Staff User 1',
                staffId: staffUser1._id,
                staffName: staffUser1.name,
                purpose: 'Meeting',
                preferredDate: new Date('2025-12-15'),
                preferredTime: '10:00 AM',
                status: 'PENDING',
                otpStatus: 'NOT_GENERATED'
            },
            {
                visitorName: 'Jane Smith',
                visitorEmail: 'jane@example.com',
                visitorPhone: '0987654321',
                personToMeet: 'Staff User 2',
                staffId: staffUser2._id,
                staffName: staffUser2.name,
                purpose: 'Consultation',
                preferredDate: new Date('2025-12-16'),
                preferredTime: '2:00 PM',
                status: 'PENDING',
                otpStatus: 'NOT_GENERATED'
            },
            {
                visitorName: 'Bob Johnson',
                visitorEmail: 'bob@example.com',
                visitorPhone: '5555555555',
                personToMeet: 'Staff User 1',
                staffId: staffUser1._id,
                staffName: staffUser1.name,
                purpose: 'Interview',
                preferredDate: new Date('2025-12-17'),
                preferredTime: '11:00 AM',
                status: 'APPROVED',
                otpStatus: 'OK'
            }
        ]);
    });

    afterEach(async () => {
        await Appointment.deleteMany({});
        await AppointmentLog.deleteMany({});
        await User.deleteMany({});
    });

    describe('getRequests', () => {
        it('should return paginated results', async () => {
            const result = await RequestService.getRequests(
                { page: 1, limit: 2 },
                adminUser
            );

            expect(result.requests).toHaveLength(2);
            expect(result.total).toBe(3);
            expect(result.page).toBe(1);
            expect(result.pageCount).toBe(2);
        });

        it('should filter by status', async () => {
            const result = await RequestService.getRequests(
                { status: 'PENDING' },
                adminUser
            );

            expect(result.requests).toHaveLength(2);
            expect(result.requests.every(r => r.status === 'PENDING')).toBe(true);
        });

        it('should enforce role-based filtering for staff', async () => {
            const result = await RequestService.getRequests(
                {},
                staffUser1
            );

            expect(result.requests).toHaveLength(2);
            expect(result.requests.every(r => r.staffId.toString() === staffUser1._id.toString())).toBe(true);
        });

        it('should allow admin to see all requests', async () => {
            const result = await RequestService.getRequests(
                {},
                adminUser
            );

            expect(result.requests).toHaveLength(3);
        });

        it('should filter by date range', async () => {
            const result = await RequestService.getRequests(
                {
                    fromDate: '2025-12-16',
                    toDate: '2025-12-17'
                },
                adminUser
            );

            expect(result.requests).toHaveLength(2);
        });

        it('should search by visitor name', async () => {
            const result = await RequestService.getRequests(
                { search: 'John' },
                adminUser
            );

            expect(result.requests).toHaveLength(1);
            expect(result.requests[0].visitorName).toBe('John Doe');
        });
    });

    describe('approveRequest', () => {
        it('should approve a PENDING request', async () => {
            const appointment = testAppointments[0];

            const result = await RequestService.approveRequest(
                appointment._id,
                { note: 'Approved by admin' },
                adminUser
            );

            expect(result.status).toBe('APPROVED');
            expect(result.notes).toBe('Approved by admin');

            // Check audit log created
            const logs = await AppointmentLog.find({ appointmentId: appointment._id });
            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe('APPROVED');
        });

        it('should reject invalid scheduledStart/End times', async () => {
            const appointment = testAppointments[0];

            await expect(
                RequestService.approveRequest(
                    appointment._id,
                    {
                        scheduledStart: new Date('2025-12-15T10:00:00'),
                        scheduledEnd: new Date('2025-12-15T09:00:00') // End before start
                    },
                    adminUser
                )
            ).rejects.toThrow('Scheduled end time must be after start time');
        });

        it('should throw error for non-modifiable statuses', async () => {
            const appointment = testAppointments[2]; // APPROVED status

            await expect(
                RequestService.approveRequest(
                    appointment._id,
                    {},
                    adminUser
                )
            ).rejects.toThrow('Cannot approve appointment with status: APPROVED');
        });

        it('should enforce permission checks for staff', async () => {
            const appointment = testAppointments[1]; // Belongs to staffUser2

            await expect(
                RequestService.approveRequest(
                    appointment._id,
                    {},
                    staffUser1
                )
            ).rejects.toThrow('Unauthorized access');
        });
    });

    describe('rejectRequest', () => {
        it('should reject a PENDING request with reason', async () => {
            const appointment = testAppointments[0];

            const result = await RequestService.rejectRequest(
                appointment._id,
                { reason: 'Not available' },
                adminUser
            );

            expect(result.status).toBe('REJECTED');
            expect(result.rejectionReason).toBe('Not available');

            // Check audit log
            const logs = await AppointmentLog.find({ appointmentId: appointment._id });
            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe('REJECTED');
        });

        it('should require a reason', async () => {
            const appointment = testAppointments[0];

            await expect(
                RequestService.rejectRequest(
                    appointment._id,
                    { reason: '' },
                    adminUser
                )
            ).rejects.toThrow('Rejection reason is required');
        });
    });

    describe('rescheduleRequest', () => {
        it('should reschedule a request with valid data', async () => {
            const appointment = testAppointments[0];

            const result = await RequestService.rescheduleRequest(
                appointment._id,
                {
                    newPreferredDate: '2025-12-20',
                    newPreferredTime: '3:00 PM',
                    reason: 'Original date not available'
                },
                adminUser
            );

            expect(result.status).toBe('RESCHEDULED');
            expect(result.rescheduleReason).toBe('Original date not available');
            expect(result.preferredTime).toBe('3:00 PM');
        });

        it('should reject past dates', async () => {
            const appointment = testAppointments[0];

            await expect(
                RequestService.rescheduleRequest(
                    appointment._id,
                    {
                        newPreferredDate: '2020-01-01',
                        newPreferredTime: '10:00 AM',
                        reason: 'Test'
                    },
                    adminUser
                )
            ).rejects.toThrow('Cannot reschedule to a past date');
        });
    });

    describe('bulkAction', () => {
        it('should process multiple appointments successfully', async () => {
            const ids = [testAppointments[0]._id, testAppointments[1]._id];

            const result = await RequestService.bulkAction(
                {
                    action: 'APPROVE',
                    appointmentIds: ids
                },
                adminUser
            );

            expect(result.total).toBe(2);
            expect(result.successCount).toBe(2);
            expect(result.failCount).toBe(0);

            // Verify appointments updated
            const updated = await Appointment.find({ _id: { $in: ids } });
            expect(updated.every(a => a.status === 'APPROVED')).toBe(true);
        });

        it('should return per-id results for partial failures', async () => {
            const ids = [
                testAppointments[0]._id,
                testAppointments[2]._id // Already APPROVED
            ];

            const result = await RequestService.bulkAction(
                {
                    action: 'APPROVE',
                    appointmentIds: ids
                },
                adminUser
            );

            expect(result.total).toBe(2);
            expect(result.successCount).toBe(1);
            expect(result.failCount).toBe(1);
            expect(result.failures).toHaveLength(1);
        });

        it('should enforce 200 id limit', async () => {
            const ids = Array(201).fill(testAppointments[0]._id);

            await expect(
                RequestService.bulkAction(
                    {
                        action: 'APPROVE',
                        appointmentIds: ids
                    },
                    adminUser
                )
            ).rejects.toThrow('Maximum 200 appointments can be processed at once');
        });

        it('should require reason for bulk reject', async () => {
            const ids = [testAppointments[0]._id];

            await expect(
                RequestService.bulkAction(
                    {
                        action: 'REJECT',
                        appointmentIds: ids
                    },
                    adminUser
                )
            ).rejects.toThrow('Reason is required for bulk rejection');
        });
    });

    describe('regenerateOTP', () => {
        it('should generate 6-digit OTP', async () => {
            const appointment = testAppointments[0];

            const result = await RequestService.regenerateOTP(
                appointment._id,
                adminUser
            );

            expect(result.otp).toMatch(/^\d{6}$/);
            expect(result.expiresAt).toBeDefined();
        });

        it('should hash and store OTP', async () => {
            const appointment = testAppointments[0];

            await RequestService.regenerateOTP(appointment._id, adminUser);

            const updated = await Appointment.findById(appointment._id);
            expect(updated.otpHash).toBeDefined();
            expect(updated.otpHash).not.toMatch(/^\d{6}$/); // Should be hashed
            expect(updated.otpStatus).toBe('OK');
            expect(updated.otpAttempts).toBe(0);
        });

        it('should only allow admin', async () => {
            const appointment = testAppointments[0];

            await expect(
                RequestService.regenerateOTP(appointment._id, staffUser1)
            ).rejects.toThrow('Only admins can regenerate OTP');
        });

        it('should create audit log', async () => {
            const appointment = testAppointments[0];

            await RequestService.regenerateOTP(appointment._id, adminUser);

            const logs = await AppointmentLog.find({ appointmentId: appointment._id });
            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe('OTP_REGENERATED');
        });
    });
});
