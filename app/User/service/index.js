/**
 * USER SERVICE
 *
 * Aggregates all service method files to be exported here
 */

'use strict';

module.exports = {
  ...require('./V1Register'),
  ...require('./V1Login'),
  ...require('./V1Read'),
  ...require('./V1Query'),
  ...require('./V1Update'),
  ...require('./V1UpdateEmail'),
  ...require('./V1UpdatePassword'),
  ...require('./V1ResetPassword'),
  ...require('./V1ConfirmPassword')
}
