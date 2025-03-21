// built-in node modules
const os = require('os');

const config = {
  verbose: true,
  // To test concurrency, uncomment the following lines and set -runInBand to false in yarn test in package.json
  // maxConcurrency: os.cpus().length - 1, // number of cores available on your machine minus one for the main thread
  // maxWorkers: os.cpus().length - 1, // number of cores available on your machine minus one for the main thread
  // setupFiles: ['./jest.setup.js'],
  // globalTeardown: './jest.teardown.js', // Runs after all tests
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  reporters: ['default', 'jest-junit', 'jest-html-reporters'],
  testTimeout: 20000
};

module.exports = config;
