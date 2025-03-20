/**
 * Check if the database user has the necessary permissions for testing
 */

'use strict';

const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../config/.env.test') });

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/orbital_test';
const match = dbUrl.match(/postgres:\/\/([^:]+)(?::([^@]+))?@([^:]+):(\d+)\/([^?]+)/);

if (!match) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
}

const user = match[1];
const password = match[2] || '';
const host = match[3];
const port = match[4];

console.log(`Checking database permissions for user '${user}'...`);

try {
  // Check if user can create databases
  const result = execSync(`PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${user} -c "SELECT rolcreatedb FROM pg_roles WHERE rolname = '${user}';"`)
    .toString()
    .trim();
  
  if (result.includes('t')) {
    console.log(`✅ User '${user}' has createdb permission`);
  } else {
    console.error(`❌ User '${user}' does NOT have createdb permission`);
    console.log(`Run the following command to grant permission: PGPASSWORD=${password} psql -h ${host} -p ${port} -U postgres -c "ALTER USER ${user} WITH CREATEDB;"`);
    process.exit(1);
  }
  
  // Check if user can create and drop test databases
  console.log('Testing database creation and deletion...');
  const testDbName = `${match[5]}_permission_test_${Date.now()}`;
  
  try {
    execSync(`PGPASSWORD=${password} createdb -h ${host} -p ${port} -U ${user} ${testDbName}`);
    console.log(`✅ Successfully created test database '${testDbName}'`);
    
    execSync(`PGPASSWORD=${password} dropdb -h ${host} -p ${port} -U ${user} ${testDbName}`);
    console.log(`✅ Successfully dropped test database '${testDbName}'`);
    
    console.log('✅ All permission checks passed! Your database user is properly configured for dynamic test databases.');
  } catch (err) {
    console.error(`❌ Error during database creation/deletion test: ${err.message}`);
    console.log('Please ensure your database user has the necessary permissions to create and drop databases.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error checking database permissions:', error.message);
  process.exit(1);
}
