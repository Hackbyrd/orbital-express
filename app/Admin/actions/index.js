/**
 * ADMIN ACTION
 *
 * Aggregates all action method files to be exported here
 * !NOTE: This file is updated automatically using the feature gen/del commands and is sorted alphabetically
 */

'use strict';

module.exports = {
  ...require('./V1ConfirmPassword'),
  ...require('./V1Create'),
  ...require('./V1Export'),
  ...require('./V1Login'),
  ...require('./V1Query'),
  ...require('./V1Read'),
  ...require('./V1ResetPassword'),
  ...require('./V1TestSocket'),
  ...require('./V1Update'),
  ...require('./V1UpdatePassword')
}
