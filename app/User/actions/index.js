/**
 * USER ACTION
 *
 * Aggregates all action method files to be exported here
 * !NOTE: This file is updated automatically using the feature gen/del commands and is sorted alphabetically
 */

'use strict';

module.exports = {
  ...require('./V1CompleteOnboarding'),
  ...require('./V1GoogleAuthStart'),
  ...require('./V1GoogleLogin'),
  ...require('./V1Login'),
  ...require('./V1Logout'),
  ...require('./V1LogoutAll'),
  ...require('./V1Read'),
  ...require('./V1Refresh'),
  ...require('./V1Register'),
  ...require('./V1Update'),
  ...require('./V1UpdateMyDepartments')
}
