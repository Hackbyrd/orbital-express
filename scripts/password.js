/**
 * Generate passwords and salt
 *
 * node scripts/password.js <YOUR_PASSWORD>
 */

// helpers
const bcrypt = require('bcrypt');
const password = process.argv[2]; // YOUR_PASSWORD

// if no password, exit
if (!password) {
  console.log('You did not enter a password. Please enter a password and try again.');
  process.exit(0);
}

// generate the salt
const salt = bcrypt.genSaltSync(12);
const secret = bcrypt.hashSync(password, salt);

// print out result
console.log('Salt: ' + salt);
console.log('Secret: ' + secret);
process.exit(0);