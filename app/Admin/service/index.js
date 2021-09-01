/**
 * ADMIN SERVICE
 */

'use strict';

// methods
module.exports = {
  ...require('./V1Login'),
  ...require('./V1Read'),
  ...require('./V1Create'),
  ...require('./V1Export'),
  ...require('./V1Update'),
  ...require('./V1Query'),
  ...require('./V1UpdatePassword'),
  ...require('./V1ResetPassword'),
  ...require('./V1ConfirmPassword'),
  ...require('./V1UpdateEmail')
};
