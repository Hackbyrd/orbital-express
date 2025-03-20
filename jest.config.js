/**
 * Jest configuration
 */

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.js'],
  globalTeardown: '<rootDir>/test/jest-teardown.js',
  testMatch: ['**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
};
