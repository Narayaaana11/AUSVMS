const crypto = require('crypto');

// Deterministic hash for OTP lookups (useful for guard portal searches)
const hashOTP = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

module.exports = { hashOTP };
