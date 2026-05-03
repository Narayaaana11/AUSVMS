/**
 * Seed Script for Default Email Templates
 * Run with: node scripts/seedTemplates.js
 */

const mongoose = require('mongoose');
const Template = require('../models/Template');
require('dotenv').config();

const defaultTemplates = [
    {
        name: 'appointment_approved',
        title: 'Appointment Approved - {{visitorName}}',
        bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #10b981;">Your Appointment is Approved!</h2>
        <p>Dear <strong>{{visitorName}}</strong>,</p>
        <p>Good news! Your appointment request has been approved.</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Meeting with:</strong> {{staffName}}</p>
          <p><strong>Date:</strong> {{date}}</p>
          <p><strong>Time:</strong> {{time}}</p>
          <p><strong>Purpose:</strong> {{purpose}}</p>
        </div>
        
        <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Your OTP:</strong> <span style="font-size: 24px; color: #dc2626; font-weight: bold;">{{otp}}</span></p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Show this OTP at the gate for entry.</p>
        </div>
        
        <p>Please arrive 10 minutes before your scheduled time.</p>
        <p>For any queries, contact the admin office.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          Aditya University Visitor Management System<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    `,
        bodyText: `Dear {{visitorName}},\n\nYour appointment has been approved!\n\nMeeting with: {{staffName}}\nDate: {{date}}\nTime: {{time}}\nPurpose: {{purpose}}\n\nYour OTP: {{otp}}\n\nPlease show this OTP at the gate for entry.\n\n-- Aditya University VMS`,
        bodySms: 'Your appointment on {{date}} at {{time}} is approved. OTP: {{otp}}. Show this at the gate.',
        enabled: true,
        channels: ['email', 'sms'],
        category: 'appointment',
        description: 'Sent when an appointment is approved by staff',
        placeholders: ['visitorName', 'staffName', 'date', 'time', 'purpose', 'otp']
    },
    {
        name: 'appointment_rejected',
        title: 'Appointment Request - Update',
        bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #ef4444;">Appointment Request Update</h2>
        <p>Dear <strong>{{visitorName}}</strong>,</p>
        <p>We regret to inform you that your appointment request has not been approved at this time.</p>
        
        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0 0 0;">{{reason}}</p>
        </div>
        
        <p>You may contact {{staffName}} directly or request a new appointment with a different time slot.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          Aditya University Visitor Management System
        </p>
      </div>
    `,
        bodyText: `Dear {{visitorName}},\n\nYour appointment request has not been approved.\n\nReason: {{reason}}\n\nYou may contact {{staffName}} or request a new appointment.\n\n-- Aditya University VMS`,
        enabled: true,
        channels: ['email'],
        category: 'appointment',
        description: 'Sent when an appointment is rejected',
        placeholders: ['visitorName', 'staffName', 'reason']
    },
    {
        name: 'appointment_rescheduled',
        title: 'Appointment Rescheduled - {{visitorName}}',
        bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #f59e0b;">Appointment Rescheduled</h2>
        <p>Dear <strong>{{visitorName}}</strong>,</p>
        <p>Your appointment has been rescheduled.</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Previous Schedule:</strong></p>
          <p>{{oldDate}} at {{oldTime}}</p>
          
          <p style="margin-top: 15px;"><strong>New Schedule:</strong></p>
          <p style="color: #10b981; font-weight: bold;">{{newDate}} at {{newTime}}</p>
          
          <p style="margin-top: 15px;"><strong>Reason:</strong> {{reason}}</p>
        </div>
        
        <p>Please arrive 10 minutes before your scheduled time.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          Aditya University Visitor Management System
        </p>
      </div>
    `,
        bodyText: `Dear {{visitorName}},\n\nYour appointment has been rescheduled.\n\nPrevious: {{oldDate}} at {{oldTime}}\nNew: {{newDate}} at {{newTime}}\n\nReason: {{reason}}\n\n-- Aditya University VMS`,
        enabled: true,
        channels: ['email'],
        category: 'appointment',
        description: 'Sent when an appointment is rescheduled',
        placeholders: ['visitorName', 'oldDate', 'oldTime', 'newDate', 'newTime', 'reason']
    },
    {
        name: 'welcome_user',
        title: 'Welcome to Aditya University VMS',
        bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #3b82f6;">Welcome to Visitor Management System!</h2>
        <p>Dear <strong>{{name}}</strong>,</p>
        <p>Your account has been created in the Aditya University Visitor Management System.</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> {{email}}</p>
          <p><strong>Role:</strong> {{role}}</p>
          <p><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">{{password}}</code></p>
        </div>
        
        <p>Please log in at your earliest convenience and change your password.</p>
        <p><a href="{{loginUrl}}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Login to VMS</a></p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">
          Aditya University Visitor Management System
        </p>
      </div>
    `,
        bodyText: `Dear {{name}},\n\nYour account has been created.\n\nEmail: {{email}}\nRole: {{role}}\nTemporary Password: {{password}}\n\nPlease log in and change your password.\n\n-- Aditya University VMS`,
        enabled: true,
        channels: ['email'],
        category: 'user',
        description: 'Sent when a new user account is created',
        placeholders: ['name', 'email', 'role', 'password', 'loginUrl']
    }
];

async function seedTemplates() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing templates (optional - comment out if you want to keep existing)
        // await Template.deleteMany({});
        // console.log('Cleared existing templates');

        // Insert templates (skip duplicates)
        for (const templateData of defaultTemplates) {
            const existing = await Template.findOne({ name: templateData.name });
            if (existing) {
                console.log(`Template "${templateData.name}" already exists, skipping`);
            } else {
                await Template.create(templateData);
                console.log(`Created template: ${templateData.name}`);
            }
        }

        console.log('Template seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding templates:', error);
        process.exit(1);
    }
}

seedTemplates();
