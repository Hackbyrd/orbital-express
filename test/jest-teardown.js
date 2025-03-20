/**
 * Jest global teardown to clean up dynamic databases
 */

'use strict';

const { execSync } = require('child_process');

module.exports = async () => {
  try {
    // List and drop any leftover test databases
    const result = execSync('psql -c "\\l" | grep _test_').toString();
    const testDbs = result.match(/_test_[a-f0-9]+/g);
    
    if (testDbs && testDbs.length > 0) {
      console.log(`Cleaning up ${testDbs.length} leftover test databases...`);
      
      for (const db of testDbs) {
        try {
          execSync(`dropdb ${db} --if-exists`);
        } catch (err) {
          console.error(`Failed to drop database ${db}: ${err.message}`);
        }
      }
    }
  } catch (error) {
    // If grep returns no results, it exits with code 1
    if (!error.message.includes('exit code 1')) {
      console.error('Error in global teardown:', error);
    }
  }
};
