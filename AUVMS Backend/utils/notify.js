const nodemailer = require('nodemailer');
const axios = require('axios');
const AuditLog = require('../models/AuditLog');

function getEmailLogLevel() {
  const lvl = String(process.env.EMAIL_LOG_LEVEL || '').toLowerCase();
  return ['silent', 'error', 'info', 'debug'].includes(lvl) ? lvl : 'error';
}

function emailLog(level, msg, obj) {
  const current = getEmailLogLevel();
  const order = { silent: 0, error: 1, info: 2, debug: 3 };
  if (order[level] <= order[current]) return; // lower level than current -> skip
  const payload = obj ? { ...obj } : undefined;
  if (level === 'error') console.error(msg, payload || '');
  else if (level === 'info') console.log(msg, payload || '');
  else if (level === 'debug') console.log(msg, payload || '');
}

async function sendEmail({ to, subject, html }) {
  try {
    emailLog('debug', '[email] Attempting to send email:', { to, subject, timestamp: new Date().toISOString() });

    const SystemConfig = require('../models/SystemConfig');
    let dbConfig = null;
    try {
      const conf = await SystemConfig.findOne({ key: 'email_smtp' });
      if (conf) dbConfig = conf.value;
    } catch (e) {
      console.warn('[email] Failed to fetch DB config:', e.message);
    }

    // Prefer DB config only when it is complete; otherwise use environment variables
    const dbHasCreds = !!(dbConfig?.authEmail && dbConfig?.authPassword);
    const user = dbHasCreds ? dbConfig.authEmail : process.env.EMAIL_USER;
    const pass = dbHasCreds ? dbConfig.authPassword : process.env.EMAIL_PASS;
    const fromName = (dbConfig?.senderName) || 'Aditya University';
    const fromEmail = (dbConfig?.senderEmail) || user;

    // Construct simplified from header
    const finalFrom = `"${fromName}" <${fromEmail}>`;

    emailLog('debug', '[email] Config check:', {
      hasUser: !!user,
      hasPass: !!pass,
      userPrefix: user ? user.substring(0, 3) + '...' : 'none',
      useEthereal: process.env.USE_ETHEREAL,
      source: dbHasCreds ? 'db' : 'env',
      smtpHost: dbConfig?.smtpHost || process.env.SMTP_HOST,
      smtpPort: dbConfig?.smtpPort || process.env.SMTP_PORT,
      to,
      subject
    });

    const useEthereal = String(process.env.USE_ETHEREAL || '').toLowerCase() === 'true';

    let transporter;

    if (!user || !pass) {
      // Fallback checks...
      if (!useEthereal) {
        emailLog('error', '[email] missing credentials (no env or db creds). Set EMAIL_USER/EMAIL_PASS or enable USE_ETHEREAL=true');
        return false;
      }
    }

    if (user && pass) {
      const host = dbConfig?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = Number(dbConfig?.smtpPort || process.env.SMTP_PORT || 465);
      const secure = port === 465; // Simplify secure check based on port

      const buildTransport = (h, p, s) => nodemailer.createTransport({ host: h, port: p, secure: s, auth: { user, pass }, tls: { rejectUnauthorized: false } });
      transporter = buildTransport(host, port, secure);
      try { await transporter.verify(); } catch (e) { emailLog('info', '[email] verify failed:', { code: e?.code, message: e?.message }); }
      try {
        const info = await transporter.sendMail({ from: finalFrom, to, subject, html });
        emailLog('info', '[email] sent via SMTP:', { messageId: info?.messageId });
        await AuditLog.create({ action: 'NOTIFICATION', resource: 'Email', details: { recipient: to, status: 'sent', messageId: info.messageId, subject } });
        return true;
      } catch (err1) {
        emailLog('error', '[email] send attempt 1 failed:', { code: err1?.code, response: err1?.response, message: err1?.message });
        try {
          transporter = buildTransport(process.env.SMTP_HOST || 'smtp.gmail.com', 587, false);
          await transporter.verify().catch((e) => emailLog('info', '[email] verify (587) failed:', { code: e?.code, message: e?.message }));
          const info = await transporter.sendMail({ from: finalFrom, to, subject, html });
          emailLog('info', '[email] sent via SMTP:587:', { messageId: info?.messageId });
          await AuditLog.create({ action: 'NOTIFICATION', resource: 'Email', details: { recipient: to, status: 'sent', messageId: info.messageId, subject } });
          return true;
        } catch (err2) {
          emailLog('error', '[email] send attempt 2 failed:', { code: err2?.code, response: err2?.response, message: err2?.message });
          await AuditLog.create({ action: 'NOTIFICATION', resource: 'Email', details: { recipient: to, status: 'failed', error: err2.message, subject } });
          if (!useEthereal) return false;
        }
      }
    }

    // Ethereal fallback (dev preview)
    if (useEthereal) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const info = await transporter.sendMail({ from: 'Aditya University <no-reply@aditya.edu>', to, subject, html });
      emailLog('info', '[email] ethereal preview URL:', { url: nodemailer.getTestMessageUrl(info) });
      await AuditLog.create({ action: 'NOTIFICATION', resource: 'Email', details: { recipient: to, status: 'sent', provider: 'ethereal', subject } });
      return true;
    }

    await AuditLog.create({ action: 'NOTIFICATION', resource: 'Email', details: { recipient: to, status: 'failed', error: 'No configuration found' } });
    return false;
  } catch (err) {
    emailLog('error', '[email] unexpected error:', { code: err?.code, message: err?.message });
    await AuditLog.create({ action: 'NOTIFICATION', resource: 'Email', details: { recipient: to, status: 'failed', error: err.message } });
    return false;
  }
}

async function sendSMS({ to, message }) {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const conf = await SystemConfig.findOne({ key: 'sms_provider' });
    const config = conf?.value || {}; // { provider, accountSid, authToken, fromNumber, apiKey }

    if (config.provider === 'twilio' && config.accountSid && config.authToken && config.fromNumber) {
      const client = require('twilio')(config.accountSid, config.authToken);
      await client.messages.create({ body: message, from: config.fromNumber, to });
      await AuditLog.create({ action: 'NOTIFICATION', resource: 'SMS', details: { recipient: to, status: 'sent', provider: 'twilio' } });
      return { to, message, sent: true, provider: 'twilio' };
    }

    // Add other providers (MSG91, etc.) here if needed

    console.log('[SMS] No valid provider config found. Mock sent:', message);
    await AuditLog.create({ action: 'NOTIFICATION', resource: 'SMS', details: { recipient: to, status: 'mock_sent', provider: 'none' } });
    return { to, message, sent: false, mock: true };
  } catch (e) {
    console.error('SMS Failed:', e.message);
    await AuditLog.create({ action: 'NOTIFICATION', resource: 'SMS', details: { recipient: to, status: 'failed', error: e.message } });
    return { to, message, sent: false };
  }
}

async function sendWhatsApp({ to, message }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneNumberId) return false;
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return true;
  } catch {
    return false;
  }
}

module.exports = { sendEmail, sendSMS, sendWhatsApp };


