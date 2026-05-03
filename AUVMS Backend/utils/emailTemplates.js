const baseStyles = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333333;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #ffffff;
`;

const headerStyles = `
  background-color: #0F172A; /* Slate 900 */
  padding: 24px;
  text-align: center;
`;

const headerTextStyles = `
  color: #ffffff;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const bodyStyles = `
  padding: 32px 24px;
`;

const footerStyles = `
  background-color: #f8f9fa;
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: #64748B;
  border-top: 1px solid #e0e0e0;
`;

const buttonStyles = `
  display: inline-block;
  background-color: #2563EB; /* Blue 600 */
  color: #ffffff;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  margin-top: 16px;
`;

const labelStyles = `
  color: #64748B;
  font-size: 14px;
  margin-bottom: 4px;
  display: block;
`;

const valueStyles = `
  color: #0F172A;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  display: block;
`;

function wrapTemplate(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="${headerTextStyles}">Aditya University</h1>
        </div>
        <div style="${bodyStyles}">
          ${content}
        </div>
        <div style="${footerStyles}">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Aditya University. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">Visitor Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

exports.getOtpTemplate = (visitorName, personToMeet, date, time, otp) => {
  const content = `
    <h2 style="margin-top: 0; color: #0F172A;">Appointment Approved</h2>
    <p>Dear <strong>${visitorName}</strong>,</p>
    <p>We are pleased to inform you that your appointment request has been approved.</p>
    
    <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <span style="${labelStyles}">Meeting With</span>
      <span style="${valueStyles}">${personToMeet}</span>
      
      <span style="${labelStyles}">Date & Time</span>
      <span style="${valueStyles}">${date} at ${time}</span>
      
      <div style="border-top: 1px solid #E2E8F0; margin: 16px 0;"></div>
      
      <span style="${labelStyles}">Your Entry OTP</span>
      <div style="font-size: 32px; font-weight: 700; color: #2563EB; letter-spacing: 4px; margin: 8px 0;">${otp}</div>
      <p style="font-size: 13px; color: #64748B; margin: 0;">Please show this OTP to the security guard at the gate.</p>
    </div>
    
    <p>We look forward to welcoming you.</p>
  `;
  return wrapTemplate(content);
};

exports.getAppointmentReceivedTemplate = (visitorName, personToMeet, purpose, passId, date, time) => {
  const content = `
    <h2 style="margin-top: 0; color: #0F172A;">Request Received</h2>
    <p>Dear <strong>${visitorName}</strong>,</p>
    <p>Thank you for registering your visit. Your appointment request has been successfully received and is currently pending approval.</p>
    
    <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <span style="${labelStyles}">Meeting With</span>
      <span style="${valueStyles}">${personToMeet}</span>
      
      <span style="${labelStyles}">Purpose</span>
      <span style="${valueStyles}">${purpose}</span>
      
      ${date && time ? `
        <span style="${labelStyles}">Preferred Date & Time</span>
        <span style="${valueStyles}">${date} at ${time}</span>
      ` : ''}
      
      <span style="${labelStyles}">Pass ID</span>
      <span style="${valueStyles}">${passId}</span>
    </div>
    
    <p>You will receive another email once your appointment is approved with an entry OTP.</p>
  `;
  return wrapTemplate(content);
};

exports.getAdminNewRequestTemplate = (visitorName, visitorPhone, meetingWith, purpose) => {
  const content = `
      <h2 style="margin-top: 0; color: #0F172A;">New Appointment Request</h2>
      <p>A new visitor appointment request has been received and requires your attention.</p>
      
      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <span style="${labelStyles}">Visitor</span>
        <span style="${valueStyles}">${visitorName} (${visitorPhone})</span>
        
        <span style="${labelStyles}">Meeting With</span>
        <span style="${valueStyles}">${meetingWith}</span>
        
        <span style="${labelStyles}">Purpose</span>
        <span style="${valueStyles}">${purpose}</span>
      </div>
      
      <p>Please log in to the admin panel to approve or reject this request.</p>
      <div style="text-align: center;">
        <a href="${process.env.VITE_APP_URL || '#'}/admin/appointments" style="${buttonStyles}">Go to Admin Panel</a>
      </div>
    `;
  return wrapTemplate(content);
};

exports.getStaffNewRequestTemplate = (visitorName, visitorPhone, purpose, date, time) => {
  const content = `
      <h2 style="margin-top: 0; color: #0F172A;">New Visitor Request</h2>
      <p>Hello,</p>
      <p>A new visitor has requested an appointment with you.</p>
      
      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <span style="${labelStyles}">Visitor</span>
        <span style="${valueStyles}">${visitorName} (${visitorPhone})</span>
        
        <span style="${labelStyles}">Purpose</span>
        <span style="${valueStyles}">${purpose}</span>
        
        <span style="${labelStyles}">Requested Date & Time</span>
        <span style="${valueStyles}">${date} at ${time}</span>
      </div>
      
      <p>Please log in to your dashboard to approve or decline this request.</p>
      <div style="text-align: center;">
        <a href="${process.env.VITE_APP_URL || '#'}/staff/dashboard" style="${buttonStyles}">Go to Staff Dashboard</a>
      </div>
    `;
  return wrapTemplate(content);
};

exports.getAppointmentRescheduledTemplate = (visitorName, personToMeet, oldDateStr, oldTimeStr, newDateStr, newTimeStr, reason) => {
  const content = `
    <h2 style="margin-top: 0; color: #0F172A;">Appointment Rescheduled</h2>
    <p>Dear <strong>${visitorName}</strong>,</p>
    <p>Your appointment with <strong>${personToMeet}</strong> has been rescheduled.</p>
    <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <span style="${labelStyles}">Previous Date & Time</span>
      <span style="${valueStyles}">${oldDateStr} at ${oldTimeStr}</span>

      <span style="${labelStyles}">New Date & Time</span>
      <span style="${valueStyles}">${newDateStr} at ${newTimeStr}</span>

      <div style="border-top: 1px solid #E2E8F0; margin: 16px 0;"></div>
      <span style="${labelStyles}">Reason</span>
      <span style="${valueStyles}">${reason}</span>
    </div>
    <p>Please make note of the new schedule.</p>
  `;
  return wrapTemplate(content);
};

exports.getAppointmentRejectedTemplate = (visitorName, personToMeet, dateStr, timeStr, reason) => {
  const content = `
    <h2 style="margin-top: 0; color: #b91c1c;">Appointment Rejected</h2>
    <p>Dear <strong>${visitorName}</strong>,</p>
    <p>Your appointment with <strong>${personToMeet}</strong> scheduled for ${dateStr} at ${timeStr} has been rejected.</p>
    <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #fca5a5;">
      <span style="${labelStyles}">Reason</span>
      <span style="${valueStyles}">${reason}</span>
    </div>
    <p>If you have any questions, please contact the university office.</p>
  `;
  return wrapTemplate(content);
};
exports.getAppointmentStatusChangeTemplate = (visitorName, personToMeet, date, time, status, message) => {
  const statusColors = {
    approved: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
    rejected: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
    cancelled: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' }
  };

  const statusColor = statusColors[status] || statusColors.approved;
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  const content = `
    <h2 style="margin-top: 0; color: #0F172A;">Appointment ${statusText}</h2>
    <p>Dear <strong>${visitorName}</strong>,</p>
    <p>Your appointment request has been ${status}.</p>
    
    <div style="background-color: ${statusColor.bg}; border: 1px solid ${statusColor.border}; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <span style="${labelStyles}">Status</span>
      <span style="color: ${statusColor.text}; font-size: 18px; font-weight: 600; display: block; margin-bottom: 16px;">${statusText}</span>
      
      <span style="${labelStyles}">Meeting With</span>
      <span style="${valueStyles}">${personToMeet}</span>
      
      <span style="${labelStyles}">Date & Time</span>
      <span style="${valueStyles}">${date} at ${time}</span>
      
      ${message ? `
        <div style="border-top: 1px solid ${statusColor.border}; margin: 16px 0; padding-top: 16px;">
          <span style="${labelStyles}">Message</span>
          <span style="${valueStyles}">${message}</span>
        </div>
      ` : ''}
    </div>
    
    ${status === 'approved' ? '<p>You will receive your entry OTP shortly. Please check your email.</p>' : ''}
    ${status === 'rejected' ? '<p>If you have any questions, please contact the university office.</p>' : ''}
  `;
  return wrapTemplate(content);
};
