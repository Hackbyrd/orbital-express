/**
 * Admin Fixture Data
 */

'use strict';

// helpers
const { ADMIN_ROLE } = require('../../../helpers/constants');

module.exports = [
  {
    id: 1,
    timezone: 'UTC',
    locale: 'en',
    active: true,
    role: ADMIN_ROLE.ADMIN,
    firstName: 'Admin 1 First',
    lastName: 'Admin 1 Last',
    email: 'admin-1@example.com',
    phone: '+12408169501',
    salt: '1-TYIUJHGIUYGDJHGAIHGKDCHJAGKSHJDGFKGHHGEKFH',
    password: 'Password1#$FA4',
    emailConfirmed: true,
    phoneConfirmed: true,
    acceptedTerms: true
  },
  {
    id: 2,
    timezone: 'UTC',
    locale: 'en',
    active: true,
    role: ADMIN_ROLE.ADMIN,
    firstName: 'Admin 2 First',
    lastName: 'Admin 2 Last',
    email: 'admin-2@example.com',
    phone: '+12408169502',
    salt: '2-TYIUJHGIUYGDJHGAIHGKDCHJAGKSHJDGFKGHHGEKFH',
    password: 'Password2#$FA4',
    emailConfirmed: true,
    phoneConfirmed: true,
    acceptedTerms: true
  },
  {
    id: 3,
    timezone: 'UTC',
    locale: 'en',
    active: true,
    role: ADMIN_ROLE.MANAGER,
    firstName: 'Admin Manager 3 First',
    lastName: 'Admin Manager 3 Last',
    email: 'admin-3@example.com',
    phone: '+12408169503',
    salt: '3-TYIUJHGIUYGDJHGAIHGKDCHJAGKSHJDGFKGHHGEKFH',
    password: 'Password3#$FA4',
    emailConfirmed: true,
    phoneConfirmed: true,
    acceptedTerms: true
  },
  {
    id: 4,
    timezone: 'UTC',
    locale: 'en',
    active: true,
    role: ADMIN_ROLE.EMPLOYEE,
    firstName: 'Admin Employee 4 First',
    lastName: 'Admin Employee 4 Last',
    email: 'admin-4@example.com',
    phone: '+12408169504',
    salt: '4-TYIUJHGIUYGDJHGAIHGKDCHJAGKSHJDGFKGHHGEKFH',
    password: 'Password4#$FA4',
    emailConfirmed: true,
    phoneConfirmed: true,
    acceptedTerms: true
  },
  {
    id: 5,
    timezone: 'UTC',
    locale: 'en',
    active: false,
    role: ADMIN_ROLE.EMPLOYEE,
    firstName: 'Admin Employee 5 First',
    lastName: 'Admin Employee 5 Last',
    email: 'admin-5@example.com',
    phone: '+12408169505',
    salt: '5-TYIUJHGIUYGDJHGAIHGKDCHJAGKSHJDGFKGHHGEKFH',
    password: 'Password5#$FA4',
    emailConfirmed: false,
    phoneConfirmed: false,
    acceptedTerms: false
  }
];
