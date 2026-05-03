const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment'); // If separate from Visitor, but based on your schema Visitor handles appointments
const dayjs = require('dayjs');

// Config
const SEED_TAG = "dev-seed-v1";

// Read passwords from environment variables
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Aditya@123';
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD || 'Aditya@123';
const GUARD_PASSWORD = process.env.SEED_GUARD_PASSWORD || 'Aditya@123';

const seedData = async () => {
    // 1. Safety Check
    if (process.env.SEED_CONFIRM !== 'YES') {
        console.error('❌  Safety check failed: SEED_CONFIRM=YES env var is required.');
        process.exit(1);
    }

    try {
        await connectDB();
        console.log('✅  Connected to Database');

        // 2. Cleanup Old Seed Data
        console.log('🧹  Cleaning up old seed data...');
        const userDel = await User.deleteMany({
            $or: [
                { 'meta.seededBy': SEED_TAG },
                { username: { $in: ['admin', 'narayana', 'guard', 'admin.seed', 'staff.seed'] } },
                { email: { $in: ['admin@example.com', 'narayana@example.com', 'guard@example.com'] } }
            ]
        });
        const visitorDel = await Visitor.deleteMany({ 'meta.seededBy': SEED_TAG });
        const logDel = await require('../models/AppointmentLog').deleteMany({ 'meta.seededBy': SEED_TAG });

        console.log(`   - Deleted ${userDel.deletedCount} seeded users`);
        console.log(`   - Deleted ${visitorDel.deletedCount} seeded visitors`);
        console.log(`   - Deleted ${logDel.deletedCount} seeded logs`);

        // Check command line args
        const CREATE_USERS = process.argv.includes('--create-users');
        const shouldCreateData = process.argv.includes('--create-data') || true; // Default to true for now

        let staffUser;

        // 3. Create Users
        if (CREATE_USERS) {
            console.log('👤  Creating seed users...');

            // Create Admin
            const adminUser = await User.create({
                username: "admin",
                name: "Admin User",
                email: "admin@example.com",
                password: ADMIN_PASSWORD,
                role: "admin",
                isActive: true,
                meta: { seededBy: SEED_TAG }
            });

            // Create Staff (Narayana)
            staffUser = await User.create({
                username: "narayana",
                name: "Narayana",
                email: "narayana@example.com",
                password: STAFF_PASSWORD,
                role: "staff",
                isActive: true,
                department: "Computer Science",
                designation: "Professor",
                meta: { seededBy: SEED_TAG }
            });

            // Create Guard
            await User.create({
                username: "guard",
                name: "Main Guard",
                email: "guard@example.com",
                password: GUARD_PASSWORD,
                role: "guard",
                isActive: true,
                assignedGate: "Main Gate",
                shift: "morning",
                meta: { seededBy: SEED_TAG }
            });

            console.log('   - Created Admin: admin / ****');
            console.log('   - Created Staff: narayana / ****');
            console.log('   - Created Guard: guard / ****');
        } else {
            staffUser = await User.findOne({ username: 'narayana' });
            if (!staffUser) {
                console.log('   - Staff user (narayana) not found, creating temp for data seeding...');
                staffUser = await User.create({
                    username: "narayana",
                    name: "Narayana",
                    email: "narayana@example.com",
                    password: STAFF_PASSWORD,
                    role: "staff",
                    meta: { seededBy: SEED_TAG }
                });
            }
        }

        // 4. Create Seed Appointments (Visitors)
        if (shouldCreateData && staffUser) {
            console.log('🌱  Creating seed appointments...');

            const today = dayjs();
            const yesterday = dayjs().subtract(1, 'day');

            const appointments = [
                // Pending Request
                {
                    name: "Rahul Sharma",
                    contactNumber: "9876543210",
                    email: "rahul@example.com",
                    purposeOfVisit: "Project Discussion",
                    personToMeet: staffUser.name,
                    staffId: staffUser._id,
                    department: staffUser.department,
                    status: "pending",
                    dateOfVisit: today.add(1, 'day').toDate(),
                    timeOfVisit: "10:00",
                    visitorPassId: "SEED-1001",
                    meta: { seededBy: SEED_TAG }
                },
                // Approved Today
                {
                    name: "Priya Patel",
                    contactNumber: "9876543211",
                    email: "priya@example.com",
                    purposeOfVisit: "Thesis Review",
                    personToMeet: staffUser.name,
                    staffId: staffUser._id,
                    department: staffUser.department,
                    status: "approved",
                    dateOfVisit: today.toDate(),
                    timeOfVisit: "11:00",
                    visitorPassId: "SEED-1002",
                    meta: { seededBy: SEED_TAG }
                },
                // Checked In (Inside Campus)
                {
                    name: "Amit Kumar",
                    contactNumber: "9876543212",
                    email: "amit@example.com",
                    purposeOfVisit: "Guest Lecture",
                    personToMeet: staffUser.name,
                    staffId: staffUser._id,
                    department: staffUser.department,
                    status: "checked-in",
                    dateOfVisit: today.toDate(),
                    timeOfVisit: "09:00",
                    checkInAt: today.hour(9).minute(15).toDate(),
                    visitorPassId: "SEED-1003",
                    meta: { seededBy: SEED_TAG }
                },
                // Denied Request
                {
                    name: "Sneha Gupta",
                    contactNumber: "9876543213",
                    email: "sneha@example.com",
                    purposeOfVisit: "Sales Pitch",
                    personToMeet: staffUser.name,
                    staffId: staffUser._id,
                    department: staffUser.department,
                    status: "rejected",
                    rejectionReason: "Not interested",
                    dateOfVisit: today.toDate(),
                    visitorPassId: "SEED-1004",
                    meta: { seededBy: SEED_TAG }
                },
                // Completed Yesterday
                {
                    name: "Vikram Singh",
                    contactNumber: "9876543214",
                    email: "vikram@example.com",
                    purposeOfVisit: "Sign Documents",
                    personToMeet: staffUser.name,
                    staffId: staffUser._id,
                    department: staffUser.department,
                    status: "completed",
                    dateOfVisit: yesterday.toDate(),
                    checkInAt: yesterday.hour(14).toDate(),
                    checkOutAt: yesterday.hour(15).toDate(),
                    visitorPassId: "SEED-1005",
                    meta: { seededBy: SEED_TAG }
                }
            ];

            const createdVisitors = await Visitor.insertMany(appointments);
            console.log(`   - Created ${createdVisitors.length} appointments for ${staffUser.name}`);

            // 5. Create Seed Activity Logs
            console.log('🌱  Creating seed activity logs...');
            const AppointmentLog = require('../models/AppointmentLog'); // Lazy load or move to top

            const logs = createdVisitors.map(v => {
                let action = 'CREATED';
                let reason = '';
                if (v.status === 'approved') action = 'APPROVED';
                if (v.status === 'rejected') { action = 'REJECTED'; reason = v.rejectionReason; }
                if (v.status === 'checked-in') action = 'CHECKED_IN';
                if (v.status === 'completed') action = 'CHECKED_OUT';

                return {
                    appointmentId: v._id,
                    action: action,
                    performedBy: v.status === 'pending' ? v.createdBy || v.staffId : v.staffId, // Mock actor
                    performedByRole: 'staff', // Mock role
                    reason: reason || v.purposeOfVisit,
                    createdAt: v.updatedAt || new Date(),
                    meta: { seededBy: SEED_TAG }
                };
            });

            await AppointmentLog.insertMany(logs);
            console.log(`   - Created ${logs.length} activity logs`);
        }

        console.log('✅  Seeding completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌  Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
