/**
 * Encryption/Decryption Service
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// third-party
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended IV size for GCM
const TAG_LENGTH = 16; // Authentication tag length
const HEADER_LENGTH = 4; // Length of the header in bytes

// ENCRYPTION_KEY is a 64-character hex string (32 bytes)
const ENCRYPTION_KEY = Buffer.from(process.env.SECRET_KEY, 'hex');

module.exports = {
  encrypt,
  decrypt
};

/**
 * Encrypts a string with AES-256-GCM.
 * Returns base64 string containing iv + tag + ciphertext.
 */
function encrypt(plaintext) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    // Write the length of just the encrypted data
    const header = Buffer.alloc(HEADER_LENGTH);
    header.writeUInt32BE(encrypted.length, 0);

    // Debug log
    // console.log('Writing length:', encrypted.length);
    // console.log('Header bytes:', header.toString('hex'));

    const result = Buffer.concat([header, iv, tag, encrypted]);
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts a base64 string previously encrypted with `encrypt`.
 */
function decrypt(ciphertext) {
  try {
    // Debug the input
    // console.log('Input ciphertext:', ciphertext);
    // console.log('Input length:', ciphertext.length);

    const data = Buffer.from(ciphertext, 'base64');

    // Debug the buffer
    // console.log('Buffer length:', data.length);
    // console.log('Buffer hex:', data.toString('hex'));

    // Read the header first
    const encryptedLength = data.readUInt32BE(0);
    // console.log('Read length:', encryptedLength);

    const offset = HEADER_LENGTH;
    const iv = data.subarray(offset, offset + IV_LENGTH);
    const tag = data.subarray(offset + IV_LENGTH, offset + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(offset + IV_LENGTH + TAG_LENGTH);

    // console.log('Actual encrypted length:', encrypted.length);

    // Validate the length
    if (encrypted.length !== encryptedLength) {
      throw new Error(`Invalid encrypted data length. Expected ${encryptedLength}, got ${encrypted.length}`);
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed');
  }
}
