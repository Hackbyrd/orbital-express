/**
 * Jest setup file for dynamic database creation
 */

'use strict';

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../config/.env.test') });

// Extend Jest timeout for database operations
jest.setTimeout(30000);

// Set a flag to indicate that we're in a test environment
process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';
