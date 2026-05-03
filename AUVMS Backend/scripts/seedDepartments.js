// Seed Departments for Aditya University
const mongoose = require('mongoose');
const path = require('path');
const Department = require('../models/Department');
const { mongoURI } = require('../config/db');

const departments = [
    // 1. Engineering & Technology (B.Tech)
    { name: 'Computer Science & Engineering', code: 'CSE', description: 'B.Tech department with multiple specializations', officeLocation: 'Engineering Block', contactEmail: 'cse@aditya.edu.in' },
    { name: 'Computer Science & Engineering (Data Science)', code: 'CSE-DS', description: 'CSE specialization in Data Science', officeLocation: 'Engineering Block', contactEmail: 'cseds@aditya.edu.in' },
    { name: 'Computer Science & Engineering (AI & ML)', code: 'CSE-AIML', description: 'CSE specialization in Artificial Intelligence & Machine Learning', officeLocation: 'Engineering Block', contactEmail: 'cseaiml@aditya.edu.in' },
    { name: 'Information Technology', code: 'IT', description: 'Information Technology department', officeLocation: 'Engineering Block', contactEmail: 'it@aditya.edu.in' },
    { name: 'Electronics & Communication Engineering', code: 'ECE', description: 'Electronics & Communication Engineering', officeLocation: 'Engineering Block', contactEmail: 'ece@aditya.edu.in' },
    { name: 'Electrical & Electronics Engineering', code: 'EEE', description: 'Electrical & Electronics Engineering', officeLocation: 'Engineering Block', contactEmail: 'eee@aditya.edu.in' },
    { name: 'Mechanical Engineering', code: 'ME', description: 'Mechanical Engineering', officeLocation: 'Engineering Block', contactEmail: 'me@aditya.edu.in' },
    { name: 'Mining Engineering', code: 'MIN', description: 'Mining Engineering', officeLocation: 'Engineering Block', contactEmail: 'mining@aditya.edu.in' },
    { name: 'Petroleum Technology', code: 'PET', description: 'Petroleum Technology', officeLocation: 'Engineering Block', contactEmail: 'petroleum@aditya.edu.in' },
    { name: 'Civil Engineering', code: 'CE', description: 'Civil Engineering', officeLocation: 'Engineering Block', contactEmail: 'ce@aditya.edu.in' },
    { name: 'Agricultural Engineering', code: 'AGE', description: 'Agricultural Engineering', officeLocation: 'Engineering Block', contactEmail: 'age@aditya.edu.in' },

    // 2. Management & Business
    { name: 'Bachelor of Business Administration (BBA)', code: 'BBA', description: 'Undergraduate business program with specializations', officeLocation: 'Management Block', contactEmail: 'bba@aditya.edu.in' },
    { name: 'BBA - Digital Marketing & Business Analytics', code: 'BBA-DMBA', description: 'BBA specializations in Digital Marketing and Business Analytics', officeLocation: 'Management Block', contactEmail: 'bba-dmba@aditya.edu.in' },
    { name: 'Master of Business Administration (MBA)', code: 'MBA', description: 'Postgraduate management program', officeLocation: 'Management Block', contactEmail: 'mba@aditya.edu.in' },

    // 3. Computer Applications
    { name: 'Master of Computer Applications (MCA)', code: 'MCA', description: 'Postgraduate program in Computer Applications', officeLocation: 'IT Block', contactEmail: 'mca@aditya.edu.in' },

    // 4. Science & Forensics
    { name: 'B.Sc. Forensic Science', code: 'BSC-FS', description: 'Undergraduate program in Forensic Science', officeLocation: 'Science Block', contactEmail: 'forensics@aditya.edu.in' },
    { name: 'B.Sc. Cyber Security & Digital Forensics', code: 'BSC-CSDF', description: 'Undergraduate program in Cyber Security & Digital Forensics', officeLocation: 'Science Block', contactEmail: 'cyberforensics@aditya.edu.in' },

    // 5. Pharmacy
    { name: 'B.Pharmacy', code: 'BPH', description: 'Undergraduate program in Pharmacy', officeLocation: 'Pharmacy Block', contactEmail: 'bpharmacy@aditya.edu.in' },
    { name: 'Pharm.D', code: 'PHARMD', description: 'Doctor of Pharmacy program', officeLocation: 'Pharmacy Block', contactEmail: 'pharmd@aditya.edu.in' },
    { name: 'M.Pharmacy', code: 'MPH', description: 'Postgraduate program in Pharmacy', officeLocation: 'Pharmacy Block', contactEmail: 'mpharmacy@aditya.edu.in' },

    // 6. Research / Doctoral Programs
    { name: 'Ph.D. in Engineering', code: 'PHD-ENG', description: 'Doctoral programs in Engineering disciplines', officeLocation: 'Research Centre', contactEmail: 'phd-eng@aditya.edu.in' },
    { name: 'Ph.D. in Sciences', code: 'PHD-SCI', description: 'Doctoral programs in Sciences', officeLocation: 'Research Centre', contactEmail: 'phd-sci@aditya.edu.in' },
    { name: 'Ph.D. in English & Management', code: 'PHD-HUM-MGMT', description: 'Doctoral programs in English & Management', officeLocation: 'Research Centre', contactEmail: 'phd-humanities@aditya.edu.in' },
];

async function run() {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    for (const dept of departments) {
        try {
            const existing = await Department.findOne({ name: dept.name });
            if (existing) {
                console.log(`Exists: ${dept.name}`);
                continue;
            }
            await Department.create(dept);
            console.log(`Added: ${dept.name}`);
        } catch (e) {
            console.error(`Error for ${dept.name}:`, e.message);
        }
    }
    await mongoose.disconnect();
    console.log('Done.');
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
