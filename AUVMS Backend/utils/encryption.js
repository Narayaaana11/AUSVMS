const crypto = require('crypto');

// Encryption algorithm
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Key should be 32 bytes (64 hex characters)
 */
function getEncryptionKey() {
    const key = process.env.NOTIF_ENC_SECRET;

    if (!key) {
        throw new Error('NOTIF_ENC_SECRET environment variable is not set');
    }

    // Convert hex string to buffer or use first 32 bytes
    if (key.length === 64) {
        return Buffer.from(key, 'hex');
    }

    // Ensure key is exactly 32 bytes
    return Buffer.from(key.padEnd(32, '0').slice(0, 32));
}

/**
 * Encrypt a value using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
    if (!text) return '';

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV and encrypted data separated by :
    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value encrypted with encrypt()
 * @param {string} encryptedText - Text in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
    if (!encryptedText) return '';

    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Mask a sensitive value for display
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of characters to show at start
 * @returns {string} - Masked value
 */
function maskValue(value, visibleChars = 0) {
    if (!value) return '';

    if (value.length <= visibleChars) {
        return '*'.repeat(value.length);
    }

    const visible = value.slice(0, visibleChars);
    const masked = '*'.repeat(Math.max(8, value.length - visibleChars));

    return `${visible}${masked}`;
}

/**
 * Check if a value is encrypted (has iv:data format)
 * @param {string} value
 * @returns {boolean}
 */
function isEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    const parts = value.split(':');
    return parts.length === 2 && parts[0].length === IV_LENGTH * 2;
}

module.exports = {
    encrypt,
    decrypt,
    maskValue,
    isEncrypted
};
