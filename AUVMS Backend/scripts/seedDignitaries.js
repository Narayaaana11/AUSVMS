require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/db');

/**
 * Dignitary Users Seeding Script
 * 
 * This script creates user accounts for college dignitaries.
 * These accounts can be used for appointments and notifications.
 * 
 * Usage: node scripts/seedDignitaries.js
 */

async function seedDignitaries() {
    try {
        // Default password for all dignitaries (will be hashed by User model)
        const defaultPassword = process.env.SEED_DIGNITARY_PASSWORD || 'Aditya@123';

        if (!process.env.SEED_DIGNITARY_PASSWORD) {
            console.warn('⚠️  Warning: Using default password. Set SEED_DIGNITARY_PASSWORD in .env.local for production.');
        }

        // Connect to database
        await connectDB();
        console.log('✓ Connected to database');

        // Define dignitary users
        const dignitaries = [
            {
                username: 'procchancellor',
                name: 'Dr. N. Satish Reddy',
                email: 'procchancellor@aditya.edu',
                password: defaultPassword,
                role: 'staff',
                designation: 'Pro Chancellor',
                department: 'Administration',
                isActive: true,
            },
            {
                username: 'deputyprocchancellor',
                name: 'Dr. M. Sreenivasa Reddy',
                email: 'deputyprocchancellor@aditya.edu',
                password: defaultPassword,
                role: 'staff',
                designation: 'Deputy Pro Chancellor',
                department: 'Administration',
                isActive: true,
            },
            {
                username: 'vicechancellor',
                name: 'Dr. M. B. Srinivas',
                email: 'vicechancellor@aditya.edu',
                password: defaultPassword,
                role: 'staff',
                designation: 'Vice Chancellor',
                department: 'Administration',
                isActive: true,
            },
            {
                username: 'proviceacademics',
                name: 'Dr. S. Rama Sree',
                email: 'proviceacademics@aditya.edu',
                password: defaultPassword,
                role: 'staff',
                designation: 'Pro-Vice Chancellor (Academics)',
                department: 'Academics',
                isActive: true,
            },
            {
                username: 'proviceengineering',
                name: 'Dr. A. Ramesh',
                email: 'proviceengineering@aditya.edu',
                password: defaultPassword,
                role: 'staff',
                designation: 'Pro-Vice Chancellor (Engineering & Sciences)',
                department: 'Engineering & Sciences',
                isActive: true,
            },
            {
                username: 'registrar',
                name: 'Dr. G. Suresh',
                email: 'registrar@aditya.edu',
                password: defaultPassword,
                role: 'staff',
                designation: 'Registrar',
                department: 'Administration',
                isActive: true,
            },
            {
                username: 'associatedean',
                name: 'Dr. M. Venkata Rajesh',
                email: 'associatedean@aditya.edu',
                password: defaultPassword,
                role: 'staff',
                designation: 'Associate Dean (School of Engineering)',
                department: 'School of Engineering',
                isActive: true,
            },
        ];

        console.log('\n📝 Creating dignitary users...');
        let created = 0;
        let skipped = 0;

        for (const userData of dignitaries) {
            try {
                // Check if user already exists
                const existing = await User.findOne({
                    $or: [
                        { username: userData.username },
                        { email: userData.email }
                    ]
                });

                if (existing) {
                    console.log(`⏭️  Skipped: ${userData.name} (${userData.username}) - already exists`);
                    skipped++;
                } else {
                    await User.create(userData);
                    console.log(`✓ Created: ${userData.name} (${userData.username})`);
                    created++;
                }
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⏭️  Skipped: ${userData.name} (${userData.username}) - duplicate key`);
                    skipped++;
                } else {
                    throw error;
                }
            }
        }

        console.log('\n✅ Dignitary users processed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Users created: ${created}`);
        console.log(`   - Users skipped: ${skipped}`);
        console.log(`   - Total dignitaries: ${dignitaries.length}`);
        console.log('   - All passwords are securely hashed');
        console.log(`   - Default password: ${defaultPassword}`);
        console.log('\n⚠️  Note: Emails are temporary placeholders and can be updated later.\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding dignitaries:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the seeding function
seedDignitaries();
