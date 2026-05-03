/**
 * Database Cleanup Script - Remove All Appointments
 * 
 * This script removes all appointments from the database
 * Use with caution!
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auvms';

async function clearAllAppointments() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Get the Appointment model
        const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
        const AppointmentLog = mongoose.model('AppointmentLog', new mongoose.Schema({}, { strict: false }));

        // Count before deletion
        const appointmentCount = await Appointment.countDocuments();
        const logCount = await AppointmentLog.countDocuments();

        console.log(`\nFound:`);
        console.log(`- ${appointmentCount} appointments`);
        console.log(`- ${logCount} appointment logs`);

        if (appointmentCount === 0 && logCount === 0) {
            console.log('\nNo appointments to delete. Database is already clean!');
            await mongoose.disconnect();
            return;
        }

        // Confirm deletion
        console.log('\n⚠️  WARNING: This will delete ALL appointments and logs!');
        console.log('Proceeding with deletion in 2 seconds...\n');

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Delete appointments
        const appointmentResult = await Appointment.deleteMany({});
        console.log(`✓ Deleted ${appointmentResult.deletedCount} appointments`);

        // Delete appointment logs
        const logResult = await AppointmentLog.deleteMany({});
        console.log(`✓ Deleted ${logResult.deletedCount} appointment logs`);

        console.log('\n✅ Database cleanup completed successfully!');

        // Disconnect
        await mongoose.disconnect();
        console.log('✓ Disconnected from MongoDB');

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the cleanup
clearAllAppointments().catch(console.error);
