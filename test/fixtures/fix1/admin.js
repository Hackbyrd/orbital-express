/**
 * Admin Fixture Data
 */

'use strict';

module.exports = [
  {
    id: 1,
    timezone: 'UTC',
    locale: 'en',
    active: true,
    firstName: 'Admin 1 First',
    lastName: 'Admin 1 Last',
    email: 'admin-1@example.com',
    phone: '+12408169501',
    salt: '1-TYIUJHGIUYGDJHGAIHGKDCHJAGKSHJDGFKGHHGEKFH',
    password: 'password1',
    emailConfirmed: true,
    phoneConfirmed: true,
    acceptedTerms: true
  },
  {
    id: 2,
    timezone: 'UTC',
    locale: 'en',
    active: true,
    firstName: 'Admin 2 First',
    lastName: 'Admin 2 Last',
    email: 'admin-2@example.com',
    phone: '+12408169502',
    salt: '2-TYIUJHGIUYGDJHGAIHGKDCHJAGKSHJDGFKGHHGEKFH',
    password: 'password2',
    emailConfirmed: true,
    phoneConfirmed: true,
    acceptedTerms: true
  }
];
