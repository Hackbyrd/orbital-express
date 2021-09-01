/**
 * !IMPORTANT: MAKE SURE NAME IS SINGULAR AND PASCAL CASE!
 *
 * Generate / Delete Feature Folder:
 * node app/generate generate [NEW_FEATURE_FOLDER_NAME]
 * node app/generate generate [EXISTING_FEATURE_FOLDER_NAME] service [NEW_SERVICE_FILE_NAME]
 * node app/generate generate [EXISTING_FEATURE_FOLDER_NAME] task [NEW_TASK_FILE_NAME]
 * node app/generate delete [NEW_FEATURE_FOLDER_NAME]
 * node app/generate delete [EXISTING_FEATURE_FOLDER_NAME] service [NEW_SERVICE_FILE_NAME]
 * node app/generate delete [EXISTING_FEATURE_FOLDER_NAME] task [NEW_TASK_FILE_NAME]
 * node app/generate stringify [ABSOLUTE_PATH_OF_FILE_TO_STRINGIFY]
 *
 *
 * Yarn Commands: Generate / Delete Feature Folder:
 * yarn gen [NEW_FEATURE_FOLDER_NAME]
 * yarn gen [EXISTING_FEATURE_FOLDER_NAME] service [NEW_SERVICE_FILE_NAME]
 * yarn gen [EXISTING_FEATURE_FOLDER_NAME] task [NEW_TASK_FILE_NAME]
 * yarn del [NEW_FEATURE_FOLDER_NAME]
 * yarn del [EXISTING_FEATURE_FOLDER_NAME] service [NEW_SERVICE_FILE_NAME]
 * yarn del [EXISTING_FEATURE_FOLDER_NAME] task [NEW_TASK_FILE_NAME]
 * yarn str [ABSOLUTE_PATH_OF_FILE_TO_STRINGIFY]
 *
 * TODO: yarn gen lang en-US English // adds a new language file to all features
 */

'use strict';

// built in modules
const fs = require('fs');
const path = require('path');
const method = process.argv[2].trim(); // choose the method ['generate', 'delete', 'stringify']

// helpers
const { LOCALES, LANGUAGES } = require('../helpers/constants');

// route version number
const version = 'v1';

// choose which method to run
if (method === 'generate') {
  switch (process.argv[4]) {
    case 'service':
      generateService();
      break;
    case 'task':
      generateTask();
      break;
    default:
      generate();
  }
} else if (method === 'delete') {
  switch (process.argv[4]) {
    case 'service':
      destroyService();
      break;
    case 'task':
      destroyTask();
      break;
    default:
      destroy();
  }
} else {
  stringify();
}

// ALL TEXTS - Use yarn str on a template file to generate text
function controllerFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} CONTROLLER\n *\n * Defines which ${pascalName} service methods are called based on the type of user role\n */\n\n'use strict';\n\n// helpers\nconst { errorResponse, ERROR_CODES } = require('../../services/error');\n\n// service\nconst service = require('./service');\n\nmodule.exports = {\n  V1Example\n}\n\n/**\n * Example Method\n *\n * /${version}/${lowerName}s/example\n *\n * Must be logged out | Must be logged in | Can be both logged in or logged out\n * Roles: ['admin', 'user']\n */\nasync function V1Example(req, res, next) {\n  let method = null; // which service method to use\n\n  // Call the correct service method based on type of user of role\n  if (req.admin)\n    method = \`V1ExampleByAdmin\`;\n  else if (req.user)\n    method = \`V1ExampleByUser\`;\n  else\n    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));\n\n  // call correct method\n  const result = await service[method](req).catch(err => next(err));\n  return res.status(result.status).json(result);\n}\n`; }
function helperFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} HELPER\n */\n\n'use strict';\n\nmodule.exports = {}\n`; }
function modelFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} MODEL\n *\n * Find Table Schema Here: "/database/schema.sql"\n */\n\n'use strict';\n\n// require custom node modules\nconst constants = require('../../helpers/constants');\n\nmodule.exports = (sequelize, DataTypes) => {\n  const ${pascalName} = sequelize.define('${camelName}', {\n\n    // All foreign keys are added in associations\n\n    example1: {\n      type: DataTypes.BOOLEAN,\n      allowNull: false,\n      defaultValue: true\n    },\n\n    example2: {\n      type: DataTypes.INTEGER,\n      allowNull: false,\n      defaultValue: 0,\n      validate: {\n        isInt: true\n      }\n    },\n\n    example3: {\n      type: DataTypes.DECIMAL(4, 2),\n      allowNull: false,\n      defaultValue: 0.00,\n      validate: {\n        isDecimal: true\n      },\n      get() {\n        // convert string to float\n        const rawValue = this.getDataValue(example3);\n        return Number(rawValue);\n      }\n    },\n\n    example4: {\n      type: DataTypes.STRING,\n      allowNull: false,\n      defaultValue: 'foo'\n    },\n\n    example5: {\n      type: DataTypes.ENUM(constants.someList),\n      allowNull: true,\n      defaultValue: null\n    },\n\n    example6: {\n      type: DataTypes.DATE,\n      allowNull: false,\n      defaultValue: DataTypes.NOW, // now\n      validate: {\n        isDate: true\n      }\n    },\n\n    example7: {\n      type: DataTypes.JSONB,\n      allowNull: true,\n      defaultValue: null\n    },\n\n    example8: {\n      type: DataTypes.TEXT,\n      allowNull: true,\n      defaultValue: null\n    }\n  }, {\n    timestamps: true, // allows sequelize to create timestamps automatically\n    freezeTableName: true, // allows sequelize to pluralize the model name\n    tableName: '${pascalName}s', // define table name, must be PascalCase!\n    hooks: {},\n    indexes: []\n  });\n\n  return ${pascalName};\n}\n`; }
function routesFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} ROUTES\n *\n * This is where we define all the routes for the ${pascalName} feature.\n * These routes get exported to the global /routes.js file.\n */\n\n'use strict';\n\n// require controller\nconst controller = require('./controller');\n\n// Returns a function that attaches ${pascalName} feature routes to the global router object\nmodule.exports = (passport, router) => {\n\n  // routes\n  router.all('/${version}/${lowerName}s/example', controller.V1Example);\n\n  // return router\n  return router;\n};\n`; }
function errorFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} ERROR\n *\n * For Better Client 4xx Error Handling For ${pascalName} Feature\n * Gets exported to /services/error.js and put in the global variable ERROR_CODES\n */\n\n'use strict';\n\n/**\n * ${pascalName} Feature Local Error Codes\n */\nconst LOCAL_ERROR_CODES = {\n  /* Place error codes below. Remember to prepend ${upperName} to the key and error value  */\n  // ${upperName}_BAD_REQUEST_ACCOUNT_INACTIVE: {\n  //   error: '${upperName}.BAD_REQUEST_ACCOUNT_INACTIVE',\n  //   status: 401,\n  //   messages: ['${upperName}[Account is not active]']\n  // }\n};\n\nmodule.exports = LOCAL_ERROR_CODES;\n`; }
function processorFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} BACKGROUND PROCESSOR\n *\n * This is where we process background tasks for the ${pascalName} feature.\n * Gets exported to /worker.js to be run in a worker process.\n */\n\n'use strict';\n\n// ENV variables\nconst { REDIS_URL } = process.env;\n\n// third party node modules\nconst Queue = require('bull'); // process background tasks from Queue\nconst ${pascalName}Queue = new Queue('${pascalName}Queue', REDIS_URL);\n\n// service\nconst { queueError } = require('../../services/error');\n\n// tasks\nconst tasks = require('./tasks');\n\n// Function is called in /worker.js\n// Returns an array of Queues used in this feature so we can gracefully close them in worker.js\nmodule.exports = () => {\n\n  // Process ${pascalName} Feature Background Tasks\n  ${pascalName}Queue.process('V1ExampleTask', tasks.V1ExampleTask);\n  ${pascalName}Queue.on('failed', async (job, error) => queueError(error, ${pascalName}Queue, job));\n  ${pascalName}Queue.on('stalled', async job => queueError(new Error('Queue Stalled.'), ${pascalName}Queue, job));\n  ${pascalName}Queue.on('error', async error => queueError(error, ${pascalName}Queue));\n\n  // future tasks below\n\n  // return array of queues to worker.js to gracefully close them\n  return [${pascalName}Queue];  // return empty array [] if not using any queues in this feature\n}\n`; }
function languageFileText({ upperName, lowerName, pascalName, camelName, locale, language }) { return `/**\n * ${pascalName} Language File: ${language}\n *\n * This file holds all ${language} language translations for the ${pascalName} feature.\n * This file is compiled by /services/language.js to generate the final ${language} locale\n * All ${language} translations aggregated from all features can be found in /locales/${locale}.json\n */\n\n'use strict';\n\nmodule.exports = {\n  '${upperName}[Example Message]': 'Example Message'\n};\n`; }
function serviceIndexFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} SERVICE\n *\n * Aggregates all service method files to be exported here\n */\n\n'use strict';\n\nmodule.exports = {\n  ...require('./V1Example')\n}\n`; }
function serviceFileText({ upperName, lowerName, pascalName, camelName, method }) { return `/**\n * ${upperName} ${method} SERVICE\n */\n\n'use strict';\n\n// ENV variables\nconst { NODE_ENV, REDIS_URL } = process.env;\n\n// third-party\nconst _ = require('lodash'); // general helper methods: https://lodash.com/docs\nconst Op = require('sequelize').Op; // for model operator aliases like $gte, $eq\nconst io = require('socket.io-emitter')(REDIS_URL); // to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/\nconst joi = require('@hapi/joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md\nconst Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst convert = require('convert-units'); // https://www.npmjs.com/package/convert-units\nconst slugify = require('slugify'); // convert string to URL friendly string: https://www.npmjs.com/package/slugify\nconst sanitize = require("sanitize-filename"); // sanitize filename: https://www.npmjs.com/package/sanitize-filename\nconst passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\nconst accounting = require('accounting'); // handle outputing readable format for currency: http://openexchangerates.github.io/accounting.js/\n\n// services\nconst email = require('../../../services/email');\nconst { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');\nconst { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');\n\n// models\nconst models = require('../../../models');\n\n// helpers\nconst { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');\nconst { randomString } = require('../../../helpers/logic');\nconst { LIST_INT_REGEX } = require('../../../helpers/constants');\n\n// queues\nconst ${pascalName}Queue = new Queue('${pascalName}Queue', REDIS_URL);\n\n// methods\nmodule.exports = {\n  ${method}\n}\n\n/**\n * Method Description\n *\n * GET  /${version}/${lowerName}s/<method>\n * POST /${version}/${lowerName}s/<method>\n *\n * Must be logged out | Must be logged in | Can be both logged in or logged out\n * Roles: ['admin', 'user']\n *\n * req.params = {}\n * req.args = {\n *   @alpha - (STRING - REQUIRED): Alpha argument description\n *   @beta - (BOOLEAN - OPTIONAL) [DEFAULT - 100]: Beta argument description\n *   @gamma - (NUMBER - OPTIONAL or REQUIRED): Cato argument description\n *   @delta - (STRING - REQUIRED): Delta argument description\n *   @zeta - (STRING - REQUIRED) [VALID - 'a', 'b']: Zeta argument description\n * }\n *\n * Success: Return something\n * Errors:\n *   400: BAD_REQUEST_INVALID_ARGUMENTS\n *   401: UNAUTHORIZED\n *   500: INTERNAL_SERVER_ERROR\n *\n * !IMPORTANT: This is an important message\n * !NOTE: This is a note\n * TODO: This is a todo\n */\nasync function ${method}(req) {\n  const schema = joi.object({\n    alpha: joi.string().trim().min(1).lowercase().required().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[alpha]'))),\n    beta: joi.boolean().default(true).optional().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[beta]'))),\n    gamma: joi.number().integer().min(1).max(10).error(new Error(req.__('${upperName}_${method}_Invalid_Argument[gamma]'))),\n    delta: joi.string().trim().lowercase().min(3).email().required().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[delta]'))),\n    zeta: joi.string().trim().valid('a', 'b').required().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[zeta]')))\n  }).with('alpha', 'beta') // must come together\n    .xor('beta', 'gamma') // one and not the other must exists\n    .or('gamma', 'delta'); // at least one must exists\n\n  // validate\n  const { error, value } = schema.validate(req.args);\n  if (error)\n    return Promise.resolve(errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error)));\n  req.args = value; // updated arguments with type conversion\n\n  try {\n    /***** DO WORK HERE *****/\n\n    // assemble data\n    const data = { key: 'value' };\n\n    // ADD BACKGROUND JOB TO QUEUE\n    const job = await ${pascalName}Queue.add('${method}Task', data);\n\n    // SOCKET EMIT EVENT\n    io.to(\`\${SOCKET_ROOMS.GLOBAL}\`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n    io.to(\`\${SOCKET_ROOMS.ADMIN}\${'_adminId_'}\`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n\n    // return\n    return Promise.resolve({\n      status: 200,\n      success: true,\n      jobId: job.id,\n      data: data\n    });\n  } catch (error) {\n    return Promise.reject(error);\n  }\n} // END ${method}\n`; }
function taskIndexFileText({ upperName, lowerName, pascalName, camelName }) { return `/**\n * ${upperName} TASK\n *\n * Aggregates all background tasks files to be exported here\n */\n\n'use strict';\n\nmodule.exports = {\n  ...require('./V1ExampleTask')\n}\n`; }
function taskFileText({ upperName, lowerName, pascalName, camelName, method }) { return `/**\n * ${upperName} ${method} TASK\n */\n\n'use strict';\n\n// ENV variables\nconst { NODE_ENV, REDIS_URL } = process.env;\n\n// third-party\nconst _ = require('lodash'); // general helper methods: https://lodash.com/docs\nconst Op = require('sequelize').Op; // for model operator aliases like $gte, $eq\nconst io = require('socket.io-emitter')(REDIS_URL); // to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/\nconst joi = require('@hapi/joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md\nconst Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst convert = require('convert-units'); // https://www.npmjs.com/package/convert-units\nconst slugify = require('slugify'); // convert string to URL friendly string: https://www.npmjs.com/package/slugify\nconst sanitize = require("sanitize-filename"); // sanitize filename: https://www.npmjs.com/package/sanitize-filename\nconst passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\nconst accounting = require('accounting'); // handle outputing readable format for currency: http://openexchangerates.github.io/accounting.js/\n\n// services\nconst email = require('../../../services/email');\nconst { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');\nconst { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');\n\n// models\nconst models = require('../../../models');\n\n// helpers\nconst { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');\nconst { randomString } = require('../../../helpers/logic');\nconst { LIST_INT_REGEX } = require('../../../helpers/constants');\n\n// queues\nconst ${pascalName}Queue = new Queue('${pascalName}Queue', REDIS_URL);\n\n// methods\nmodule.exports = {\n  ${method}\n}\n\n/**\n * Method Description\n *\n * @job = {\n *   @id - (INTEGER - REQUIRED): ID of the background job\n *   @data = {\n *     @alpha - (STRING - REQUIRED): Alpha argument description\n *     @beta - (BOOLEAN - OPTIONAL) [DEFAULT - 100]: Beta argument description\n *     @gamma - (NUMBER - OPTIONAL or REQUIRED): Cato argument description\n *     @delta - (STRING - REQUIRED): Delta argument description\n *     @zeta - (STRING - REQUIRED) [VALID - 'a', 'b']: Zeta argument description\n *   }\n * }\n *\n * Success: Return something\n *\n * !IMPORTANT: This is an important message\n * !NOTE: This is a note\n * TODO: This is a todo\n */\nasync function ${method}(job) {\n  const schema = joi.object({\n    alpha: joi.string().trim().min(1).lowercase().required().error(new Error(req.__('${upperName}_V1Example_Invalid_Argument[alpha]'))),\n    beta: joi.boolean().default(true).optional().error(new Error(req.__('${upperName}_V1Example_Invalid_Argument[beta]'))),\n    gamma: joi.number().integer().min(1).max(10).error(new Error(req.__('${upperName}_V1Example_Invalid_Argument[gamma]'))),\n    delta: joi.string().trim().lowercase().min(3).email().required().error(new Error(req.__('${upperName}_V1Example_Invalid_Argument[delta]'))),\n    zeta: joi.string().trim().valid('a', 'b').required().error(new Error(req.__('${upperName}_V1Example_Invalid_Argument[zeta]')))\n  }).with('alpha', 'beta') // must come together\n    .xor('beta', 'gamma') // one and not the other must exists\n    .or('gamma', 'delta'); // at least one must exists\n\n  // validate\n  const { error, value } = schema.validate(job.data);\n  if (error)\n    return Promise.resolve(new Error(joiErrorsMessage(error)));\n  job.data = value; // updated arguments with type conversion\n\n  try {\n    /***** DO WORK HERE *****/\n\n    // assemble data\n    const data = { key: 'value' };\n\n    // ADD BACKGROUND JOB TO QUEUE\n    const job = await ${pascalName}Queue.add('${method}', data);\n\n    // SOCKET EMIT EVENT\n    io.to(\`\${SOCKET_ROOMS.GLOBAL}\`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n    io.to(\`\${SOCKET_ROOMS.ADMIN}\${'_adminId_'}\`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n\n    // return\n    return Promise.resolve();\n  } catch (error) {\n    return Promise.reject(error);\n  }\n} // END ${method}\n`; }
function integrationTestFileText({ upperName, lowerName, pascalName, camelName, method }) { return `/**\n * TEST ${upperName} ${method} METHOD\n */\n\n'use strict';\n\n// build-in node modules\nconst path = require('path');\n\n// load test env\nrequire('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });\n\n// ENV variables\nconst { NODE_ENV, REDIS_URL } = process.env;\n\n// third party\nconst i18n = require('i18n'); // https://github.com/mashpie/i18n-node\nconst Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\n\n// server & models\nconst app = require('../../../../server');\nconst models = require('../../../../models');\n\n// assertion library\nconst { expect } = require('chai');\nconst request = require('supertest');\n\n// services\nconst { errorResponse, ERROR_CODES } = require('../../../../services/error');\n\n// helpers\nconst { adminLogin, userLogin, reset, populate } = require('../../../../helpers/tests');\n\n// queues\nconst ${pascalName}Queue = new Queue('${pascalName}Queue', REDIS_URL);\n\ndescribe.skip('${pascalName}.${method}', async () => {\n  // grab fixtures here\n  const adminFix = require('../../../fixtures/fix1/admin');\n  const userFix = require('../../../fixtures/fix1/user');\n\n  // url of the api method we are testing\n  const routeVersion = '/${version}';\n  const routePrefix = '/${lowerName}s';\n  const routeMethod = '/<method>';\n  const routeUrl = \`\${routeVersion}\${routePrefix}\${routeMethod}\`;\n\n  // clear database\n  beforeEach(async () => {\n    await reset();\n  });\n\n  // Logged Out\n  describe.skip('Role: Logged Out', async () => {\n    // populate database with fixtures and empty queues\n    beforeEach(async () => {\n      await populate('fix1');\n      await ${pascalName}Queue.empty();\n    });\n\n    it('should test something', async () => {\n      try {\n        // execute tests here\n      } catch (error) {\n        throw error;\n      }\n    }); // END should test something\n  }); // END Role: Logged Out\n\n  // Role: Admin\n  describe.skip('Role: Admin', async () => {\n    const jwt = 'jwt-admin';\n\n    // populate database with fixtures and empty queues\n    beforeEach(async () => {\n      await populate('fix1');\n      await ${pascalName}Queue.empty();\n    });\n\n    it('[admin] should test something', async () => {\n      try {\n        // execute tests here\n      } catch (error) {\n        throw error;\n      }\n    }); // END should test something\n  }); // END Role: Admin\n\n  // Role: User\n  describe.skip('Role: User', async () => {\n    const jwt = 'jwt-user';\n\n    // populate database with fixtures and empty queues\n    beforeEach(async () => {\n      await populate('fix1');\n      await ${pascalName}Queue.empty();\n    });\n\n    it('[user] should test something', async () => {\n      try {\n        // execute tests here\n      } catch (error) {\n        throw error;\n      }\n    }); // END should test something\n  }); // END Role: User\n}); // END ${pascalName}.${method}\n`; }
function tasksTestFileText({ upperName, lowerName, pascalName, camelName, method }) { return `/**\n * TEST ${upperName} ${method} METHOD\n */\n\n'use strict';\n\n// build-in node modules\nconst path = require('path');\n\n// load test env\nrequire('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });\n\n// ENV variables\nconst { NODE_ENV, REDIS_URL } = process.env;\n\n// third party\nconst i18n = require('i18n'); // https://github.com/mashpie/i18n-node\nconst Queue = require('bull'); // add background tasks to Queue: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueclean\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\n\n// server & models\nconst app = require('../../../../server');\nconst models = require('../../../../models');\n\n// assertion library\nconst { expect } = require('chai');\nconst request = require('supertest');\n\n// tasks\nconst { ${method} } = require('../../../../app/${pascalName}/tasks');\n\n// services\nconst { errorResponse, ERROR_CODES } = require('../../../../services/error');\n\n// helpers\nconst { adminLogin, userLogin, reset, populate } = require('../../../../helpers/tests');\n\n// queues\nconst ${pascalName}Queue = new Queue('${pascalName}Queue', REDIS_URL);\n\ndescribe.skip('${pascalName}.${method}', async () => {\n  // grab fixtures here\n  const adminFix = require('../../../fixtures/fix1/admin');\n  const userFix = require('../../../fixtures/fix1/user');\n\n  // clear database, populate database with fixtures and empty queues\n  beforeEach(async () => {\n    await reset();\n    await populate('fix1');\n    await ${pascalName}Queue.empty();\n  });\n\n  it('should test something', async () => {\n    try {\n      // execute tests here\n    } catch (error) {\n      throw error;\n    }\n  }); // END should test something\n}); // END ${pascalName}.${method}\n`; }
function sequenceFileText(featureNames) { return `/**\n * This is the table order in which test fixture and seed data is added into the database.\n * Make sure to do MODEL NAME (Lower-case & Singular)!!! DO NOT DO TABLE NAME (Pascal-case & Plural)\n */\n\nmodule.exports = [${featureNames}];\n`; }

/**
 * 1. Generate Feature Folder
 * 2. Generate Test Folder
 * 3. Update database/sequence.js
 */
function generate() {
  const newDir = process.argv[3]; // NEW_FEATURE
  const newDirPath = path.join(__dirname, newDir);
  const newLangDirPath = path.join(newDirPath, 'language');
  const newServiceDirPath = path.join(newDirPath, 'service');
  const newTaskDirPath = path.join(newDirPath, 'tasks');
  const newTestDirPath = path.join(__dirname, '../test/app', newDir);

  console.log(`Generating ${newDir} feature...`);

  // if directory already exists
  if (fs.existsSync(newDirPath)) {
    console.error(`Error: ${newDir} feature already exists. Please use different name.`);
    process.exit(1);
  }

  // names
  const upperName = newDir.toUpperCase();
  const lowerName = newDir.toLowerCase();
  const pascalName = newDir[0].toUpperCase() + '' + newDir.substring(1);
  const camelName = newDir[0].toLowerCase() + '' + newDir.substring(1);

  const NAMES = {upperName, lowerName, pascalName, camelName };

  // make directory
  fs.mkdirSync(newDirPath);

  /****************************/
  /***** Create App Files *****/
  /****************************/
  let fd = null; // file descriptor

  /***** Controller *****/
  fd = fs.openSync(path.join(newDirPath, 'controller.js'), 'w');
  fs.writeSync(fd, controllerFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  /***** Helper *****/
  fd = fs.openSync(path.join(newDirPath, 'helper.js'), 'w');
  fs.writeSync(fd, helperFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  /***** Model *****/
  fd = fs.openSync(path.join(newDirPath, 'model.js'), 'w');
  fs.writeSync(fd, modelFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  /***** Routes *****/
  fd = fs.openSync(path.join(newDirPath, 'routes.js'), 'w');
  fs.writeSync(fd, routesFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  /***** Error *****/
  fd = fs.openSync(path.join(newDirPath, 'error.js'), 'w');
  fs.writeSync(fd, errorFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  /***** Processor *****/
  fd = fs.openSync(path.join(newDirPath, 'processor.js'), 'w');
  fs.writeSync(fd, processorFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  /*********************************/
  /***** Create Language Files *****/
  /*********************************/

  // make language directory
  fs.mkdirSync(newLangDirPath);

  // create each language file
  for (let i = 0; i < LOCALES.length; i++) {
    const locale = LOCALES[i];
    const language = LANGUAGES[i];

    fd = fs.openSync(path.join(newLangDirPath, `${locale}.js`), 'w');
    fs.writeSync(fd, languageFileText({ ...NAMES, locale, language }), 0, 'utf-8');
    fs.closeSync(fd);
  }

  /********************************/
  /***** Create Service Files *****/
  /********************************/
  fs.mkdirSync(newServiceDirPath);

  // service index
  fd = fs.openSync(path.join(newServiceDirPath, 'index.js'), 'w');
  fs.writeSync(fd, serviceIndexFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  // service method
  fd = fs.openSync(path.join(newServiceDirPath, 'V1Example.js'), 'w');
  fs.writeSync(fd, serviceFileText({ ...NAMES, method: 'V1Example' }), 0, 'utf-8');
  fs.closeSync(fd);

  /******************************/
  /***** Create Tasks Files *****/
  /******************************/
  fs.mkdirSync(newTaskDirPath);

  // tasks index
  fd = fs.openSync(path.join(newDirPath, 'tasks/index.js'), 'w');
  fs.writeSync(fd, taskIndexFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  // tasks method
  fd = fs.openSync(path.join(newDirPath, 'tasks/V1ExampleTask.js'), 'w');
  fs.writeSync(fd, taskFileText({ ...NAMES, method: 'V1ExampleTask' }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Created ${newDirPath}`);

  /*****************************/
  /***** Create Test Files *****/
  /*****************************/

  // make test directory
  fs.mkdirSync(newTestDirPath);

  // create integration test files
  fs.mkdirSync(path.join(newTestDirPath, 'integration'));
  fd = fs.openSync(path.join(newTestDirPath, 'integration/V1Example.js'), 'w');
  fs.writeSync(fd, integrationTestFileText({ ...NAMES, method: 'V1Example' }), 0, 'utf-8');
  fs.closeSync(fd);

  // create background tasks test files
  fs.mkdirSync(path.join(newTestDirPath, 'tasks'));
  fd = fs.openSync(path.join(newTestDirPath, 'tasks/V1ExampleTask.js'), 'w');
  fs.writeSync(fd, tasksTestFileText({ ...NAMES, method: 'V1ExampleTask' }), 0, 'utf-8');
  fs.closeSync(fd);

  fs.closeSync(fs.openSync(path.join(newTestDirPath, 'helper.js'), 'w'));
  fs.closeSync(fs.openSync(path.join(newTestDirPath, 'service.js'), 'w'));

  console.log(`Created ${newTestDirPath}`);

  /******************************/
  /***** Update Sequence.js *****/
  /******************************/
  const sequenceArray = require('../database/sequence');

  // add new feature name
  sequenceArray.push(camelName);
  const featureNames = sequenceArray.map(name => `'${name}'`).join(', ');

  fd = fs.openSync(path.join(__dirname, '../database/sequence.js'), 'w');
  fs.writeSync(fd, sequenceFileText(featureNames), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Added '${camelName}' to database/sequence.js`);

  // Finished
  console.log(`${newDir} feature generated!`);
}

/**
 * 1. Generate Service File
 * 2. Generate Integration Test File
 */
function generateService() {
  const newFileName = process.argv[5]; // FILE
  const featDir = process.argv[3]; // FEATURE
  const featDirPath = path.join(__dirname, featDir);
  const featServiceDirPath = path.join(featDirPath, 'service');
  const featTestDirPath = path.join(__dirname, '../test/app', featDir);

  console.log(`Generating ${newFileName} file in service folder of ${featDir} feature...`);

  // if directory exists
  if (!fs.existsSync(featDirPath)) {
    console.error(`Error: ${featDir} feature does not exists.`);
    process.exit(1);
  }

  // must provide a file name
  if (!newFileName) {
    console.error(`Error: Please pass in file name.`);
    process.exit(1);
  }

  // add .js
  const newFileNameJS = newFileName.indexOf('.js') < 0 ? `${newFileName}.js` : newFileName;

  // names
  const upperName = featDir.toUpperCase();
  const lowerName = featDir.toLowerCase();
  const pascalName = featDir[0].toUpperCase() + '' + featDir.substring(1);
  const camelName = featDir[0].toLowerCase() + '' + featDir.substring(1);

  const NAMES = {upperName, lowerName, pascalName, camelName };

  // service file
  let fd = fs.openSync(path.join(featServiceDirPath, newFileNameJS), 'w');
  fs.writeSync(fd, serviceFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Created ${path.join(featServiceDirPath, newFileNameJS)}...`);

  // service test file
  fd = fs.openSync(path.join(featTestDirPath, `integration/${newFileNameJS}`), 'w');
  fs.writeSync(fd, integrationTestFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Created ${path.join(featTestDirPath, `integration/${newFileNameJS}`)}...`);
  console.log();
  console.log('Remember to update: routes.js, controller.js and service/index.js');
}

/**
 * 1. Generate Task File
 * 2. Generate Task Test File
 */
function generateTask() {
  const newFileName = process.argv[5]; // FILE
  const featDir = process.argv[3]; // FEATURE
  const featDirPath = path.join(__dirname, featDir);
  const featTasksDirPath = path.join(featDirPath, 'tasks');
  const featTestDirPath = path.join(__dirname, '../test/app', featDir);

  console.log(`Generating ${newFileName} file in tasks folder of ${featDir} feature...`);

  // if directory exists
  if (!fs.existsSync(featDirPath)) {
    console.error(`Error: ${featDir} feature does not exists.`);
    process.exit(1);
  }

  // must provide a file name
  if (!newFileName) {
    console.error(`Error: Please pass in file name.`);
    process.exit(1);
  }

  // add .js
  const newFileNameJS = newFileName.indexOf('.js') < 0 ? `${newFileName}.js` : newFileName;

  // names
  const upperName = featDir.toUpperCase();
  const lowerName = featDir.toLowerCase();
  const pascalName = featDir[0].toUpperCase() + '' + featDir.substring(1);
  const camelName = featDir[0].toLowerCase() + '' + featDir.substring(1);

  const NAMES = {upperName, lowerName, pascalName, camelName };

  // task file
  let fd = fs.openSync(path.join(featTasksDirPath, newFileNameJS), 'w');
  fs.writeSync(fd, taskFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Created ${path.join(featTasksDirPath, newFileNameJS)}...`);

  // task test file
  fd = fs.openSync(path.join(featTestDirPath, `tasks/${newFileNameJS}`), 'w');
  fs.writeSync(fd, tasksTestFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Created ${path.join(featTestDirPath, `tasks/${newFileNameJS}`)}...`);
  console.log();
  console.log('Remember to update: processor.js and tasks/index.js');
}

/**
 * 1. Deletes Feature Folder
 * 2. Deletes Test Folder
 * 3. Updates database/sequence.js
 */
function destroy() {
  const rmDir = process.argv[3]; // NEW_FEATURE
  const rmDirPath = path.join(__dirname, rmDir);
  const rmTestDirPath = path.join(__dirname, '../test/app', rmDir);
  const camelName = rmDir[0].toLowerCase() + '' + rmDir.substring(1);

  console.log(`Deleting ${rmDir} feature...`);

  // if directory exists
  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exists.`);
    process.exit(1);
  }

  // delete app/Feature
  fs.rmdirSync(rmDirPath, { recursive: true });
  console.log(`Deleted ${rmDirPath}`);

  // delete test/app/Feature
  fs.rmdirSync(rmTestDirPath, { recursive: true });
  console.log(`Deleted ${rmTestDirPath}`);

  // remove feature name from database/sequence.js
  const sequenceArray = require('../database/sequence');
  sequenceArray.splice(sequenceArray.indexOf(camelName), 1);
  const featureNames = sequenceArray.map(name => `'${name}'`).join(', ');

  // file descriptor
  let fd = fs.openSync(path.join(__dirname, '../database/sequence.js'), 'w');
  fs.writeSync(fd, sequenceFileText(featureNames), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Removed '${camelName}' from database/sequence.js`);

  // Finished
  console.log(`${rmDir} feature deleted!`);
}

/**
 * 1. Deletes Service File
 * 2. Deletes Integration Test File
 */
function destroyService() {
  const rmFileName = process.argv[5] // file name
  const rmDir = process.argv[3]; // NEW_FEATURE
  const rmDirPath = path.join(__dirname, rmDir);
  const rmServiceDirPath = path.join(rmDirPath, 'service');
  const rmTestDirPath = path.join(__dirname, '../test/app', rmDir);

  console.log(`Deleting ${rmFileName} service files...`);

  // if directory exists
  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exists.`);
    process.exit(1);
  }

  // must provide a file name
  if (!rmFileName) {
    console.error(`Error: Please pass in file name.`);
    process.exit(1);
  }

  // add .js
  const rmFileNameJS = rmFileName.indexOf('.js') < 0 ? `${rmFileName}.js` : rmFileName;

  // files to remove
  const rmServiceDirPathFile = path.join(rmServiceDirPath, rmFileNameJS);
  const rmTestDirPathIntegrationFile = path.join(rmTestDirPath, 'integration', rmFileNameJS);

  // if file exists
  if (!fs.existsSync(rmServiceDirPathFile)) {
    console.error(`Error: ${rmServiceDirPathFile} file does not exists.`);
    process.exit(1);
  }

  // delete service file
  fs.rmdirSync(rmServiceDirPathFile, { recursive: true });
  console.log(`Deleted ${rmServiceDirPathFile}`);

  // delete test integration file
  fs.rmdirSync(rmTestDirPathIntegrationFile, { recursive: true });
  console.log(`Deleted ${rmTestDirPathIntegrationFile}`);

  console.log();
  console.log('Remember to update: routes.js, controller.js and service/index.js');
}

/**
 * 1. Deletes Task File
 * 2. Deletes Task Test File
 */
function destroyTask() {
  const rmFileName = process.argv[5] // file name
  const rmDir = process.argv[3]; // NEW_FEATURE
  const rmDirPath = path.join(__dirname, rmDir);
  const rmTasksDirPath = path.join(rmDirPath, 'tasks');
  const rmTestDirPath = path.join(__dirname, '../test/app', rmDir);

  console.log(`Deleting ${rmFileName} tasks files...`);

  // if directory exists
  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exists.`);
    process.exit(1);
  }

  // must provide a file name
  if (!rmFileName) {
    console.error(`Error: Please pass in file name.`);
    process.exit(1);
  }

  // add .js
  const rmFileNameJS = rmFileName.indexOf('.js') < 0 ? `${rmFileName}.js` : rmFileName;

  // files to remove
  const rmTasksDirPathFile = path.join(rmTasksDirPath, rmFileNameJS);
  const rmTestDirPathTasksFile = path.join(rmTestDirPath, 'tasks', rmFileNameJS);

  // if file exists
  if (!fs.existsSync(rmTasksDirPathFile)) {
    console.error(`Error: ${rmTasksDirPathFile} file does not exists.`);
    process.exit(1);
  }

  // delete tasks file
  fs.rmdirSync(rmTasksDirPathFile, { recursive: true });
  console.log(`Deleted ${rmTasksDirPathFile}`);

  // delete test tasks file
  fs.rmdirSync(rmTestDirPathTasksFile, { recursive: true });
  console.log(`Deleted ${rmTestDirPathTasksFile}`);

  console.log();
  console.log('Remember to update: processor.js and tasks/index.js');
}

/**
 * Takes in a file path and stringifies it to help with writing the generate and delete functions above
 * You should put in arguments in the format ${variable} so we can just copy and paste it into this file
 */
function stringify() {
  const filePath = process.argv[3]; // the file path of the file to stringify
  let fileText = fs.readFileSync(filePath, 'utf8');
  fileText = fileText.replace(/\n/g, '\\n').replace(/`/g, '\\`'); //.replace(/\${/g, '\\${');

  console.log(fileText);
}
