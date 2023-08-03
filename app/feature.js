/**
 * !IMPORTANT: MAKE SURE NAME IS SINGULAR AND PASCAL CASE!
 *
 * Generate / Delete Feature Folder:
 * node app/feature generate|gen|-g [NEW_FEATURE_FOLDER_NAME]
 * node app/feature generate|gen|-g [EXISTING_FEATURE_FOLDER_NAME] action|-a [NEW_ACTION_FILE_NAME]
 * node app/feature generate|gen|-g [EXISTING_FEATURE_FOLDER_NAME] task|-t [NEW_TASK_FILE_NAME]
 * node app/feature generate|gen|-g [EXISTING_FEATURE_FOLDER_NAME] mail|-m [NEW_MAILER_FILE_NAME]
 * node app/feature delete|del|-d [NEW_FEATURE_FOLDER_NAME]
 * node app/feature delete|del|-d [EXISTING_FEATURE_FOLDER_NAME] action|-a [NEW_ACTION_FILE_NAME]
 * node app/feature delete|del|-d [EXISTING_FEATURE_FOLDER_NAME] task|-t [NEW_TASK_FILE_NAME]
 * node app/feature delete|del|-d [EXISTING_FEATURE_FOLDER_NAME] mail|-m [NEW_MAILER_FILE_NAME]
 * node app/feature stringify|str|-s [ABSOLUTE_PATH_OF_FILE_TO_STRINGIFY]
 *
 *
 * Yarn Commands: Generate / Delete Feature Folder:
 * yarn gen [NEW_FEATURE_FOLDER_NAME]
 * yarn gen [EXISTING_FEATURE_FOLDER_NAME] action|-a [NEW_ACTION_FILE_NAME]
 * yarn gen [EXISTING_FEATURE_FOLDER_NAME] task|-t [NEW_TASK_FILE_NAME]
 * yarn gen [EXISTING_FEATURE_FOLDER_NAME] mail|-m [NEW_MAILER_FILE_NAME]
 * yarn del [NEW_FEATURE_FOLDER_NAME]
 * yarn del [EXISTING_FEATURE_FOLDER_NAME] action|-a [NEW_ACTION_FILE_NAME]
 * yarn del [EXISTING_FEATURE_FOLDER_NAME] task|-t [NEW_TASK_FILE_NAME]
 * yarn del [EXISTING_FEATURE_FOLDER_NAME] mail|-m [NEW_MAILER_FILE_NAME]
 * yarn str [ABSOLUTE_PATH_OF_FILE_TO_STRINGIFY]
 *
 * TODO: yarn gen lang en-US English // adds a new language file to all features
 */

'use strict';

// built in modules
const fs = require('fs');
const path = require('path');
const method = process.argv[2].trim(); // choose the method ['generate|gen|-g', 'delete|del|-d', 'stringify|str|-s']

// helpers
const { LOCALES, LANGUAGES } = require('../helpers/constants');

// route version number
const version = 'v1';

// choose which method to run
if (method === 'generate' || method === 'gen' || method === '-g') {
  switch (process.argv[4]) {
    case 'action':
    case '-a':
      generateAction();
      break;
    case 'task':
    case '-t':
      generateTask();
      break;
    case 'mail':
    case '-m':
      generateMail();
      break;
    default:
      generate();
  }
} else if (method === 'delete' || method === 'del' || method === '-d') {
  switch (process.argv[4]) {
    case 'action':
    case '-a':
      destroyAction();
      break;
    case 'task':
    case '-t':
      destroyTask();
      break;
    case 'mail':
    case '-m':
      destroyMail();
      break;
    default:
      destroy();
  }
} else if (method === 'stringify' || method === 'str' || method === '-') {
  stringify();
} else {
  console.error(`\nError: Invalid command. Please try 'generate|gen|-g', 'delete|del|-d', 'stringify|str|-s'`);
  process.exit(1);
}

// ALL TEXTS - Use yarn str on a template file to generate text
function controllerFileText({ upperName, lowerName, pascalName, camelName }) {
  return `/**\n * ${upperName} CONTROLLER\n *\n * Defines which ${pascalName} action methods are called based on the type of user role\n */\n\n'use strict';\n\n// helpers\nconst { errorResponse, ERROR_CODES } = require('../../services/error');\n\n// actions\nconst actions = require('./actions');\n\nmodule.exports = {\n  V1Example\n}\n\n/**\n * Example Method\n *\n * /${version}/${lowerName}s/example\n *\n * Must be logged out | Must be logged in | Can be both logged in or logged out\n * Roles: ['admin', 'member', 'member.ADMIN']\n */\nasync function V1Example(req, res, next) {\n  let method = null; // which action method to use\n\n  // Call the correct action method based on type of user of role\n  if (req.admin)\n    method = \`V1ExampleByAdmin\`;\n  else if (req.partner)\n    method = \`V1ExampleByPartner\`;\n  else if (req.user)\n    method = \`V1ExampleByUser\`;\n  else\n    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));\n\n  // call correct method\n  try {\n    const result = await actions[method](req, res);\n\n    return res.status(result.status).json(result);\n  } catch (error) {\n    return next(error);\n  }\n} // END V1Example \n`;
}
function helperFileText({ upperName, lowerName, pascalName, camelName }) {
  return `/**\n * ${upperName} HELPER\n */\n\n'use strict';\n\nmodule.exports = {}\n`;
}
function modelFileText({ upperName, lowerName, pascalName, camelName }) {
  return `/**\n * ${upperName} MODEL\n *\n * Find Table Schema Here: "/database/schema.sql"\n */\n\n'use strict';\n\n// require custom node modules\nconst constants = require('../../helpers/constants');\n\nmodule.exports = (sequelize, DataTypes) => {\n  const ${pascalName} = sequelize.define('${camelName}', {\n\n    // All foreign keys are added in associations\n\n    example1: {\n      type: DataTypes.BOOLEAN,\n      allowNull: false,\n      defaultValue: true\n    },\n\n    example2: {\n      type: DataTypes.INTEGER,\n      allowNull: false,\n      defaultValue: 0,\n      validate: {\n        isInt: true\n      }\n    },\n\n    example3: {\n      type: DataTypes.DECIMAL(4, 2),\n      allowNull: false,\n      defaultValue: 0.00,\n      validate: {\n        isDecimal: true\n      },\n      get() {\n        // convert string to float\n        const rawValue = this.getDataValue(example3);\n        // must check because if allowNull is TRUE, because it might return 0 but should instead return NULL\n        return (rawValue === null ? rawValue : Number(rawValue));\n      }\n    },\n\n    example4: {\n      type: DataTypes.STRING,\n      allowNull: false,\n      defaultValue: 'foo'\n    },\n\n    example5: {\n      type: DataTypes.ENUM(constants.someList),\n      allowNull: true,\n      defaultValue: null\n    },\n\n    example6: {\n      type: DataTypes.DATE,\n      allowNull: false,\n      defaultValue: DataTypes.NOW, // now\n      validate: {\n        isDate: true\n      }\n    },\n\n    example7: {\n      type: DataTypes.JSONB,\n      allowNull: true,\n      defaultValue: null\n    },\n\n    example8: {\n      type: DataTypes.TEXT,\n      allowNull: true,\n      defaultValue: null\n    }\n  }, {\n    timestamps: true, // allows sequelize to create timestamps automatically\n\n    // A paranoid table is one that, when told to delete a record, it will not truly delete it. Instead, a special column called deletedAt will have its value set to the timestamp of that deletion request. This means that paranoid tables perform a soft-deletion of records, instead of a hard-deletion.\n    // For select (findOne, findAll etc) automatically ignore all rows when deletedAt is not null, if you really want to let the query see the soft-deleted records, you can pass the paranoid: false option to the query method\n    paranoid: true,\n    freezeTableName: true, // allows sequelize to pluralize the model name\n    tableName: '${pascalName}s', // define table name, must be PascalCase!\n    hooks: {},\n    indexes: []\n  });\n\n  // association\n  ${pascalName}.associate = models => {\n    // ${pascalName} belongs to <OtherModelName>\n    ${pascalName}.belongsTo(models.otherModelName, {\n      as: '${lowerName}',\n      foreignKey: {\n        name: 'otherModelId',\n        allowNull: false,\n      },\n    });\n  }\n\n  return ${pascalName};\n}\n`;
}
function routesFileText({ upperName, lowerName, pascalName, camelName }) {
  return `/**\n * ${upperName} ROUTES\n *\n * This is where we define all the routes for the ${pascalName} feature.\n * These routes get exported to the global /routes.js file.\n */\n\n'use strict';\n\n// require controller\nconst controller = require('./controller');\n\n// Returns a function that attaches ${pascalName} feature routes to the global router object\nmodule.exports = (passport, router) => {\n\n  // routes - can also use router.get or router.post\n  // IMPORTANT: Routes should be all lowercase, no underscores or dashes. '/v1/${lowerName}/multiplewordsroute'\n  router.all('/${version}/${lowerName}s/example', controller.V1Example);\n\n  // return router\n  return router;\n};\n`;
}
function errorFileText({ upperName, lowerName, pascalName, camelName }) {
  return `/**\n * ${upperName} ERROR\n *\n * For Better Client 4xx Error Handling For ${pascalName} Feature\n * Gets exported to /services/error.js and put in the global variable ERROR_CODES\n */\n\n'use strict';\n\n/**\n * ${pascalName} Feature Local Error Codes\n */\nconst LOCAL_ERROR_CODES = {\n  /* Place error codes below. Remember to prepend ${upperName} to the key and error value  */\n  // ${upperName}_BAD_REQUEST_ACCOUNT_INACTIVE: {\n  //   error: '${upperName}.BAD_REQUEST_ACCOUNT_INACTIVE',\n  //   status: 401,\n  //   messages: ['${upperName}[Account is not active]']\n  // }\n};\n\nmodule.exports = LOCAL_ERROR_CODES;\n`;
}
function workerFileText({ upperName, lowerName, pascalName, camelName }) {
  return `/**\n * ${upperName} BACKGROUND WORKER\n *\n * This is where we process background tasks for the ${pascalName} feature.\n * Gets exported to the top level /worker.js to be run in a worker process.\n */\n\n'use strict';\n\n// services\nconst queue = require('../../services/queue'); // process background tasks from Queue\nconst { queueError } = require('../../services/error');\n\n// tasks\nconst tasks = require('./tasks');\n\n// Function is called in /worker.js\nmodule.exports = () => {\n\n  // Process ${pascalName} Feature Background Tasks. Example below\n  // const ${pascalName}Queue = queue.get('${pascalName}Queue');\n  // ${pascalName}Queue.process('V1ExampleTask', tasks.V1ExampleTask);\n  // ${pascalName}Queue.on('failed', async (job, error) => queueError(error, ${pascalName}Queue, job));\n  // ${pascalName}Queue.on('stalled', async job => queueError(new Error('Queue Stalled.'), ${pascalName}Queue, job));\n  // ${pascalName}Queue.on('error', async error => queueError(error, ${pascalName}Queue));\n\n  // Add future tasks below\n\n} // End worker.js\n`;
}
function languageFileText({ upperName, lowerName, pascalName, camelName, locale, language }) {
  return `/**\n * ${pascalName} Language File: ${language}\n *\n * This file holds all ${language} language translations for the ${pascalName} feature.\n * This file is compiled by /services/language.js to generate the final ${language} locale\n * All ${language} translations aggregated from all features can be found in /locales/${locale}.json\n */\n\n'use strict';\n\nmodule.exports = {\n  '${upperName}[snake_case_example_message]': 'Example Message'\n};\n`;
}
function actionIndexFileText({ upperName, lowerName, pascalName, camelName, actions }) {
  return `/**\n * ${upperName} ACTION\n *\n * Aggregates all action method files to be exported here\n * !NOTE: This file is updated automatically using the feature gen/del commands and is sorted alphabetically\n */\n\n'use strict';\n\nmodule.exports = {${actions === undefined ? "\n  ...require('./V1Example')\n" : actions ? `\n  ${actions}\n` : '' }}\n`;
}
function actionFileText({ upperName, lowerName, pascalName, camelName, method }) {
  return `/**\n * ${upperName} ${method} ACTION\n */\n\n'use strict';\n\n// ENV variables\nconst { NODE_ENV, HOSTNAME } = process.env;\n\n// built-in node modules\nconst os = require('os');\nconst fs = require('fs');\nconst path = require('path');\n\n// third-party node modules\nconst _ = require('lodash'); // general helper methods: https://lodash.com/docs\nconst Op = require('sequelize').Op; // for model operator aliases like $gte, $eq\nconst joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst convert = require('convert-units'); // https://www.npmjs.com/package/convert-units\nconst slugify = require('slugify'); // convert string to URL friendly string: https://www.npmjs.com/package/slugify\nconst sanitize = require("sanitize-filename"); // sanitize filename: https://www.npmjs.com/package/sanitize-filename\nconst passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\nconst accounting = require('accounting'); // handle outputing readable format for currency: http://openexchangerates.github.io/accounting.js/\n\n// services\nconst email = require('../../../services/email'); // to send emails\nconst queue = require('../../../services/queue'); // process background tasks from Queue\nconst socket = require('../../../services/socket'); // require socket service to initiate socket.io to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/\nconst { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');\nconst { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');\n\n// helpers\nconst { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');\nconst { randomString } = require('../../../helpers/logic');\nconst { LIST_INT_REGEX, DATE_TIME_FORMAT_Z } = require('../../../helpers/constants');\n// const { localHelperMethod } = require('../helpers'); // local helpers related to ${pascalName} feature folder\n\n// models\nconst models = require('../../../models');\n\n// methods - Notice that module.exports defines the methods first and THEN we write the actual methods below. We do this BECAUSE as the file gets bigger and bigger, it is much easier to find the methods you are looking for. It may not seem like a problem now but as the codebase gets more complex and files get to be thousands of lines and you are debugging or figuring out how something works, it is much easier to find the method you are looking for if you have all the methods defined at the top of the file. This is extremely important.\nmodule.exports = {\n  ${method}\n}\n\n/**\n * Method Description\n *\n * GET  /v1/${lowerName}s/<method>\n * POST /v1/${lowerName}s/<method>\n *\n * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node\n *\n * Must be logged out | Must be logged in | Can be both logged in or logged out\n * Roles: ['admin', 'member', 'member.ADMIN']\n *\n * req.params = {}\n * req.args = {\n *   @alpha - (STRING - REQUIRED): Alpha argument description\n *   @beta - (BOOLEAN - OPTIONAL) [DEFAULT - 100]: Beta argument description\n *   @charlie - (NUMBER - OPTIONAL or REQUIRED): Cato argument description\n *   @gamma - (STRING - OPTIONAL if req.admin exists): Gamma argument description\n *   @delta - (STRING - REQUIRED): Delta argument description\n *   @zeta - (STRING - REQUIRED) [VALID - 'a', 'b']: Zeta argument description\n * }\n *\n * Success: Return { status: 200, success: true, data: { key: 'value' }}\n * Errors:\n *   400: BAD_REQUEST_INVALID_ARGUMENTS\n *   401: UNAUTHORIZED\n *   500: INTERNAL_SERVER_ERROR\n *\n * !IMPORTANT: This is an important message\n * !NOTE: This is a note\n * TODO: This is a todo\n */\nasync function ${method}(req, res) {\n  const schema = joi.object({\n    alpha: joi.string().trim().min(1).lowercase().required().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[alpha]'))),\n    beta: joi.boolean().default(true).optional().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[beta]'))),\n    charlie: joi.number().integer().min(1).max(10).error(new Error(req.__('${upperName}_${method}_Invalid_Argument[charlie]'))),\n    delta: joi.string().trim().lowercase().min(3).email().required().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[delta]'))),\n    gamma: joi.string().when(joi.ref('$admin'), { // if admin exists on req.admin, then gamma is optional, otherwise it is required\n      is: joi.exist(),\n      then: joi.optional(),\n      otherwise: joi.required(),\n    }).error(new Error(req.__('${upperName}_${method}_Invalid_Argument[gamma]'))),\n    zeta: joi.string().trim().valid('a', 'b').required().error(new Error(req.__('${upperName}_${method}_Invalid_Argument[zeta]')))\n  }).with('alpha', 'beta') // must come together\n    .xor('beta', 'gamma') // one and not the other must exists\n    .or('gamma', 'delta'); // at least one must exists\n\n  // validate\n  const { error, value } = schema.validate(req.args, { context: req }); // have { context: req } here so in joi we can check if admin exists on req.admin above\n  if (error)\n    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));\n  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true\n\n  /***** DO WORK HERE *****/\n  try {\n    // assemble data\n    const data = { key: 'value' };\n\n    // ADD BACKGROUND JOB TO QUEUE\n    const ${pascalName}Queue = queue.get('${pascalName}Queue'); // grab relevent queue\n    const job = await ${pascalName}Queue.add('${method}Task', data); // add new job to queue\n\n    // language translation - key should follow this format, FEATURE_FOLDER_NAME[snake_case_details]. UPPERCASE feature folder followed by snake case details of key\n    // const message = req.__('${upperName}[put_new_message_key]', { email: 'bob@example.com' });\n\n    // SOCKET EMIT EVENT\n    // const io = await socket.get(); // get socket.io instance\n    // io.to(\`\${SOCKET_ROOMS.GLOBAL}\`\).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n    // io.to(\`\${SOCKET_ROOMS.ADMIN}\${EXAMPLE_ADMIN_ID}\`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n\n    // return response - this will be wrapped around in a "resolve" promise automatically because this is an async function\n    return {\n      status: 200,\n      success: true,\n      jobId: job.id,\n      data: data\n    };\n  } catch (error) {\n    // this will be wrapped around in a "reject" promise automatically because this is an async function\n    throw error;\n  }\n} // END ${method}\n`;
}
function taskIndexFileText({ upperName, lowerName, pascalName, camelName, tasks }) {
  return `/**\n * ${upperName} TASK\n *\n * Aggregates all background task files to be exported here\n * !NOTE: This file is updated automatically using the feature gen/del commands and is sorted alphabetically\n */\n\n'use strict';\n\nmodule.exports = {${tasks === undefined ? "\n  ...require('./V1ExampleTask')\n" : tasks ? `\n  ${tasks}\n` : '' }}\n`;
}
function taskFileText({ upperName, lowerName, pascalName, camelName, method }) {
  return `/**\n * ${upperName} ${method} TASK\n */\n\n'use strict';\n\n// ENV variables\nconst { NODE_ENV, HOSTNAME } = process.env;\n\n// built-in node modules\nconst os = require('os');\nconst fs = require('fs');\nconst path = require('path');\n\n// third-party node modules\nconst _ = require('lodash'); // general helper methods: https://lodash.com/docs\nconst Op = require('sequelize').Op; // for model operator aliases like $gte, $eq\nconst joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst convert = require('convert-units'); // https://www.npmjs.com/package/convert-units\nconst slugify = require('slugify'); // convert string to URL friendly string: https://www.npmjs.com/package/slugify\nconst sanitize = require("sanitize-filename"); // sanitize filename: https://www.npmjs.com/package/sanitize-filename\nconst passport = require('passport'); // handle authentication: http://www.passportjs.org/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\nconst accounting = require('accounting'); // handle outputing readable format for currency: http://openexchangerates.github.io/accounting.js/\n\n// services\nconst email = require('../../../services/email'); // to send emails\nconst queue = require('../../../services/queue'); // process background tasks from Queue\nconst i18n = require('../../../services/language').getI18n(); // grab i18n after we configured it. defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files: https://github.com/mashpie/i18n-node\nconst socket = require('../../../services/socket'); // require socket service to initiate socket.io to emit real-time events to client-side applications: https://socket.io/docs/emit-cheatsheet/\nconst { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');\nconst { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');\n\n// helpers\nconst { getOffset, getOrdering, convertStringListToWhereStmt } = require('../../../helpers/cruqd');\nconst { randomString } = require('../../../helpers/logic');\nconst { LIST_INT_REGEX } = require('../../../helpers/constants');\n\n// models\nconst models = require('../../../models');\n\n// methods\nmodule.exports = {\n  ${method}\n}\n\n/**\n * Method Description\n *\n * @job = {\n *   @id - (INTEGER - REQUIRED): ID of the background job\n *   @data = {\n *     @alpha - (STRING - REQUIRED): Alpha argument description\n *     @beta - (BOOLEAN - OPTIONAL) [DEFAULT - 100]: Beta argument description\n *     @gamma - (NUMBER - OPTIONAL or REQUIRED): Cato argument description\n *     @delta - (STRING - REQUIRED): Delta argument description\n *     @zeta - (STRING - REQUIRED) [VALID - 'a', 'b']: Zeta argument description\n *   }\n * }\n *\n * Success: Return true\n *\n * !IMPORTANT: This is an important message\n * !NOTE: This is a note\n * TODO: This is a todo\n */\nasync function ${method}(job) {\n  const schema = joi.object({\n    alpha: joi.string().trim().min(1).lowercase().required().error(new Error(i18n.__('${upperName}_V1Example_Invalid_Argument[alpha]'))),\n    beta: joi.boolean().default(true).optional().error(new Error(i18n.__('${upperName}_V1Example_Invalid_Argument[beta]'))),\n    gamma: joi.number().integer().min(1).max(10).error(new Error(i18n.__('${upperName}_V1Example_Invalid_Argument[gamma]'))),\n    delta: joi.string().trim().lowercase().min(3).email().required().error(new Error(i18n.__('${upperName}_V1Example_Invalid_Argument[delta]'))),\n    zeta: joi.string().trim().valid('a', 'b').required().error(new Error(i18n.__('${upperName}_V1Example_Invalid_Argument[zeta]')))\n  }).with('alpha', 'beta') // must come together\n    .xor('beta', 'gamma') // one and not the other must exists\n    .or('gamma', 'delta'); // at least one must exists\n\n  // validate\n  const { error, value } = schema.validate(job.data);\n  if (error)\n    throw new Error(joiErrorsMessage(error));\n  job.data = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true\n\n  try {\n    /***** DO WORK HERE *****/\n\n    // assemble data\n    const data = { key: 'value' };\n\n    // ADD BACKGROUND JOB TO QUEUE\n    const ${pascalName}Queue = queue.get('${pascalName}Queue'); // grab relevent queue\n    const job = await ${pascalName}Queue.add('${method}', data);\n\n    // language translation - key should follow this format, FEATURE_FOLDER_NAME[snake_case_details]. UPPERCASE feature folder followed by snake case details of key\n    // const message = i18n.__('${upperName}[put_new_message_key]', { email: 'bob@example.com' });\n\n    // SOCKET EMIT EVENT\n    // const io = await socket.get(); // get socket.io instance\n    // io.to(\`\${SOCKET_ROOMS.GLOBAL}\`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n    // io.to(\`\${SOCKET_ROOMS.ADMIN}\${'EXAMPLE_ADMIN_ID'}\`).emit(SOCKET_EVENTS.EXAMPLE_EVENT, data);\n\n    // return true - this will be wrapped around in a "resolve" promise automatically because this is an async function\n    return true;\n  } catch (error) {\n    throw error; // this will be wrapped around in a "reject" promise automatically because this is an async function\n  }\n} // END ${method}\n`;
}
function mailFileText({ upperName, lowerName, pascalName, camelName, method }) {
  return `<!--\nADD DESCRIPTION HERE\n\nArguments: These are passed in from the mailer function\n  @i18n = (OBJECT - OPTIONAL): i18n object so you can use different languages in your email\n  @isTestEmail - (BOOLEAN - OPTIONAL) [DEFAULT - false in production env]: Whether to show a message that this is a test email in dev / test environments\n  @functionOne - (FUNCTION - OPTIONAL): Description of @functionOne. You can pass in a function if you need to use it in this template. ex. moment.js for date formatting\n  @argumentOne - (NUMBER - REQUIRED): Description of @argumentOne\n  @argumentTwo - (STRING - REQUIRED): Description of @argumentOne\n-->\n\n<!-- Shared Doctype -->\n<%- include('../../../../mailers/layouts/doctype.ejs'); %>\n\n<!-- Outer HTML Tag -->\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">\n  \n  <!-- Shared <head></head> tag -->\n  <%- include('../../../../mailers/layouts/head.ejs', { isTestEmail: locals.isTestEmail }); %>\n\n  <body>\n    <!-- Shared Body Header -->\n    <%- include('../../../../mailers/layouts/header.ejs', { isTestEmail: locals.isTestEmail }); %>\n\n    <!---------- ADD MAIN BODY CONTENT BELOW ---------->\n    <%= locals.i18n ? i18n('Hi') : 'Hi' %> <%= locals.argumentOne ? argumentOne : 'none' %><br/>\n\n    <% for (let i = 0; i < 10; i++) { %>\n      <strong><%= locals.argumentTwo ? argumentTwo : 'none' %></strong>\n    <% } %>\n    <!---------- END ADD MAIN BODY CONTENT BELOW ---------->\n\n    <!-- Shared Body Footer -->\n    <%- include('../../../../mailers/layouts/footer.ejs', { isTestEmail: locals.isTestEmail }); %>\n  </body>\n</html>\n`;
}
function integrationTestFileText({ upperName, lowerName, pascalName, camelName, method }) {
  return `/**\n * TEST ${upperName} ${method} METHOD\n *\n * JEST CHEATSHEET: https://devhints.io/jest\n */\n\n'use strict';\n\n// build-in node modules\nconst path = require('path');\n\n// load test env\nrequire('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });\n\n// ENV variables\nconst { NODE_ENV, HOSTNAME } = process.env;\n\n// third party\nconst _ = require('lodash'); // general helper methods: https://lodash.com/docs\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\nconst { faker } = require('@faker-js/faker'); // https://fakerjs.dev/api\n\n// models\nconst models = require('../../../../models');\n\n// assertion library\nconst request = require('supertest');\n\n// services\nconst queue = require('../../../../services/queue'); // process background tasks from Queue\nconst i18n = require('../../../../services/language').getI18n(); // grab i18n after we configured it. defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files: https://github.com/mashpie/i18n-node\nconst socket = require('../../../../services/socket'); // require socket service to initiate socket.io\nconst { errorResponse, ERROR_CODES } = require('../../../../services/error');\n\n// helpers\nconst { adminLogin, partnerLogin, userLogin, reset, populate } = require('../../../../helpers/tests');\n\n// server: initialize server in the beforeAll function because it is an async function\nlet app = null;\n\n// queues: add queues you will use in testing here\nlet ${pascalName}Queue = null; // initial value, will be set in beforeEach because it is async\n\ndescribe('${pascalName}.${method}', () => {\n  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests\n  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));\n  const partnerFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/partner'));\n  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));\n\n  // fixtures\n  let adminFix = null;\n  let partnerFix = null;\n  let userFix = null;\n\n  // url of the api method we are testing\n  const routeVersion = '/${version}';\n  const routePrefix = '/${lowerName}s';\n  const routeMethod = '/<INSERT_METHOD>';\n  const routeUrl = \`\${routeVersion}\${routePrefix}\${routeMethod}\`;\n\n  // beforeAll: initialize app server\n  beforeAll(async () => {\n    try {\n      app = await require('../../../../server');\n    } catch (error) {\n      console.error(error);\n      throw error;\n    }\n  });\n\n  // beforeEach: reset fixtures, establish & empty queue connections, establish socket connections and clear database\n  beforeEach(async () => {\n    // reset fixtures with fresh deep copy, must call these functions to get deep copy because we don't want modified fixtures from previous tests to affect other tests\n    adminFix = adminFixFn();\n    partnerFix = partnerFixFn();\n    userFix = userFixFn();\n\n    try {\n      // create queue connections here\n      ${pascalName}Queue = queue.get('${pascalName}Queue');\n      await ${pascalName}Queue.obliterate({ force: true }); // make sure queue is empty before each test runs\n\n      await socket.get(); // create socket connection\n      await reset(); // reset database\n    } catch (error) {\n      console.error(error);\n      throw error;\n    }\n  });\n\n  // afterAll: close all queue & socket connections, close database & app server connections\n  afterAll(async () => {\n    try {\n      await queue.closeAll(); // close all queue connections\n      await socket.close(); // close socket connection\n      await models.db.close(); // close database connection\n      app.close(); // close server connection\n    } catch (error) {\n      console.error(error);\n      throw error;\n    }\n  });\n\n  // Logged Out\n  describe('Role: Logged Out', () => {\n    // populate database with fixtures and empty queues\n    beforeEach(async () => {\n      try {\n        await populate('fix1'); // populate test database with fix1 dataset\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    });\n\n    it('[logged-out] should test something', async () => {\n      try {\n        // execute tests here\n\n        // example code below\n        const res = await request(app).get(routeUrl);\n        expect(res.statusCode).toBe(401);\n        expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));\n\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    }); // END [logged-out] should test something\n  }); // END Role: Logged Out\n\n  // Role: Admin\n  describe('Role: Admin', () => {\n    const jwt = 'jwt-admin';\n\n    // populate database with fixtures and empty queues\n    beforeEach(async () => {\n      try {\n        await populate('fix1'); // populate test database with fix1 dataset\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    });\n\n    it('[admin] should test something', async () => {\n      const admin1 = adminFix[0]; // grab admin from fixtures\n\n      try {\n        // execute tests here\n        // example code below\n\n        // login admin\n        const { token } = await adminLogin(app, routeVersion, request, admin1);\n\n        // request params\n        const params = {\n          id: 1\n        };\n\n        // execute request\n        const res = await request(app)\n          .post(routeUrl)\n          .set('authorization', \`\${jwt} \${token}\`)\n          .send(params);\n\n        // check response\n        expect(res.statusCode).toBe(200);\n        expect(res.body).toHaveProperty('success', true);\n\n        // check ${pascalName}Queue to see if job was created\n        // https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md\n        const jobs = await ${pascalName}Queue.getJobs();\n        expect(jobs).toHaveLength(1); // only one job should be created\n        expect(jobs[0].name).toBe('V1ExampleTask'); // the job name should be V1ExampleTask\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    }); // END should test something\n  }); // END Role: Admin\n\n  // Role: Partner\n  describe('Role: Partner', () => {\n    const jwt = 'jwt-partner';\n\n    // populate database with fixtures and empty queues\n    beforeEach(async () => {\n      try {\n        await populate('fix1'); // populate test database with fix1 dataset\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    });\n\n    it('[partner] should test something', async () => {\n      const partner1 = partnerFix[0]; // grab partner from fixtures\n\n      try {\n        // execute tests here\n        // example code below\n\n        // login partner\n        const { token } = await partnerLogin(app, routeVersion, request, partner1);\n\n        // request params\n        const params = {\n          id: 1\n        };\n\n        // execute request\n        const res = await request(app)\n          .post(routeUrl)\n          .set('authorization', \`\${jwt} \${token}\`)\n          .send(params);\n\n        // check response\n        expect(res.statusCode).toBe(200);\n\n        expect(res.body).toHaveProperty('success', true);\n        // check ${pascalName}Queue to see if job was created\n        // https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md\n        const jobs = await ${pascalName}Queue.getJobs();\n        expect(jobs).toHaveLength(1); // only one job should be created\n        expect(jobs[0].name).toBe('V1ExampleTask'); // the job name should be V1ExampleTask\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    }); // END should test something\n  }); // END Role: Partner\n\n  // Role: User\n  describe('Role: User', () => {\n    const jwt = 'jwt-user';\n\n    // populate database with fixtures and empty queues\n    beforeEach(async () => {\n      try {\n        await populate('fix1'); // populate test database with fix1 dataset\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    });\n\n    it('[user] should test something', async () => {\n      const user1 = userFix[0]; // grab user from fixtures\n\n      try {\n        // execute tests here\n        // example code below\n\n        // login user\n        const { token } = await userLogin(app, routeVersion, request, user1);\n\n        // request params\n        const params = {\n          id: 1\n        };\n\n        // execute request\n        const res = await request(app)\n          .post(routeUrl)\n          .set('authorization', \`\${jwt} \${token}\`)\n          .send(params);\n\n        // check response\n        expect(res.statusCode).toBe(200);\n        expect(res.body).toHaveProperty('success', true);\n\n        // check ${pascalName}Queue to see if job was created\n        // https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md\n        const jobs = await ${pascalName}Queue.getJobs();\n        expect(jobs).toHaveLength(1); // only one job should be created\n        expect(jobs[0].name).toBe('V1ExampleTask'); // the job name should be V1ExampleTask\n      } catch (error) {\n        console.error(error);\n        throw error;\n      }\n    }); // END should test something\n  }); // END Role: User\n}); // END ${pascalName}.${method}\n`;
}
function tasksTestFileText({ upperName, lowerName, pascalName, camelName, method }) {
  return `/**\n * TEST ${upperName} ${method} METHOD\n *\n * JEST CHEATSHEET: https://devhints.io/jest\n */\n\n'use strict';\n\n// build-in node modules\nconst path = require('path');\n\n// load test env\nrequire('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });\n\n// ENV variables\nconst { NODE_ENV, HOSTNAME } = process.env;\n\n// third party\nconst _ = require('lodash'); // general helper methods: https://lodash.com/docs\nconst moment = require('moment-timezone'); // manage timezone and dates: https://momentjs.com/timezone/docs/\nconst currency = require('currency.js'); // handling currency operations (add, subtract, multiply) without JS precision issues: https://github.com/scurker/currency.js/\nconst { faker } = require('@faker-js/faker'); // https://fakerjs.dev/api\n\n// models\nconst models = require('../../../../models');\n\n// assertion library\nconst request = require('supertest');\n\n// tasks\nconst { ${method} } = require('../../../../app/${pascalName}/tasks');\n\n// services\nconst queue = require('../../../../services/queue'); // process background tasks from Queue\nconst i18n = require('../../../../services/language').getI18n(); // grab i18n after we configured it. defaults to en locale and defaults to './locales' relative to node_modules directory to grab language json files: https://github.com/mashpie/i18n-node\nconst socket = require('../../../../services/socket'); // require socket service to initiate socket.io\nconst { errorResponse, ERROR_CODES } = require('../../../../services/error');\n\n// helpers\nconst { adminLogin, partnerLogin, userLogin, reset, populate } = require('../../../../helpers/tests');\n\n// server: initialize server in the beforeAll function because it is an async function\nlet app = null;\n\n// queues: add queues you will use in testing here\nlet UserQueue = null; // initial value, will be set in beforeEach because it is async\n\ndescribe('${pascalName}.${method}', () => {\n  // grab fixtures and convert to function so every test has fresh deep copy of fixtures otherwise if we don't do this, then fixtures will be modified by previous tests and affect other tests\n  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));\n  const partnerFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/partner'));\n  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));\n\n  // fixtures\n  let adminFix = null;\n  let partnerFix = null;\n  let userFix = null;\n\n  // beforeAll: initialize app server\n  beforeAll(async () => {\n    try {\n      app = await require('../../../../server');\n    } catch (error) {\n      console.error(error);\n      throw error;\n    }\n  });\n\n  // beforeEach: reset fixtures, establish & empty queue connections, establish socket connections and clear database, populate database with fixtures and empty queues\n  beforeEach(async () => {\n    // reset fixtures with fresh deep copy, must call these functions to get deep copy because we don't want modified fixtures from previous tests to affect other tests\n    adminFix = adminFixFn();\n    partnerFix = partnerFixFn();\n    userFix = userFixFn();\n\n    try {\n      // create queue connections here\n      ${pascalName}Queue = queue.get('${pascalName}Queue');\n      await ${pascalName}Queue.obliterate({ force: true }); // make sure queue is empty before each test runs\n\n      await socket.get(); // create socket connection\n      await reset(); // reset database\n      await populate('fix1'); // populate test database with fix1 dataset\n    } catch (error) {\n      console.error(error);\n      throw error;\n    }\n  });\n\n  // afterAll: close all queue & socket connections, close database & app server connections\n  afterAll(async () => {\n    try {\n      await queue.closeAll(); // close all queue connections\n      await socket.close(); // close socket connection\n      await models.db.close(); // close database connection\n      app.close(); // close server connection\n    } catch (error) {\n      console.error(error);\n      throw error;\n    }\n  });\n\n  it('should test something', async () => {\n    try {\n      // execute tests here\n\n      // check ${pascalName}Queue to see if job was created\n      // https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md\n      const jobs = await ${pascalName}Queue.getJobs();\n      expect(jobs).toHaveLength(1); // only one job should be created\n      expect(jobs[0].name).toBe('V1ExampleTask'); // the job name should be V1ExampleTask\n    } catch (error) {\n      console.error(error);\n      throw error;\n    }\n  }); // END should test something\n}); // END ${pascalName}.${method}\n`;
}
function sequenceFileText(featureNames) {
  return `/**\n * This is the table order in which test fixture and seed data is added into the database.\n * Make sure to do MODEL NAME (Lower-case & Singular)!!! DO NOT DO TABLE NAME (Pascal-case & Plural)\n */\n\n'use strict';\n\nmodule.exports = [${featureNames ? '\n  ' : ''}${featureNames}${featureNames ? '\n' : ''}];\n`;
}
// function testFeatureIndexFileText({ upperName, lowerName, pascalName, camelName, method }) { return `/**\n * This file runs all test files in the app/${pascalName} feature folder.\n * !Important: DO NOT EDIT THIS FILE.\n */\n\n'use strict';\n\n// require built-in node modules\nconst path = require('path');\n\n// require third-party node modules\nconst glob = require('glob');\n\n// variables\nconst JS_FILES = glob.sync('app/${pascalName}/tests/**/*.js');\n\n// require / run all the tests\nJS_FILES.forEach(f => require(path.join('../../../', f)));\n` }

/**
 * 1. Generate Feature Folder with actions, languages, tasks, tests, controller, mailers, error, helper, model, routes, and worker
 * 2. Update database/sequence.js
 */
function generate() {
  const newDir = process.argv[3]; // NEW_FEATURE
  const newDirPath = path.join(__dirname, newDir);
  const newLangDirPath = path.join(newDirPath, 'languages');
  const newActionsDirPath = path.join(newDirPath, 'actions');
  const newTasksDirPath = path.join(newDirPath, 'tasks');
  const newMailersDirPath = path.join(newDirPath, 'mailers');
  const newTestsDirPath = path.join(newDirPath, 'tests');
  // const newTestAppDirPath = path.join(__dirname, '../test/app', newDir);

  console.log(`Generating ${newDir} feature...\n`);

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

  const NAMES = { upperName, lowerName, pascalName, camelName };

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

  /***** Worker *****/
  fd = fs.openSync(path.join(newDirPath, 'worker.js'), 'w');
  fs.writeSync(fd, workerFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  /*********************************/
  /***** Create Language Files *****/
  /*********************************/

  // make languages directory
  fs.mkdirSync(newLangDirPath);

  // create each language file
  for (let i = 0; i < LOCALES.length; i++) {
    const locale = LOCALES[i];
    const language = LANGUAGES[i];

    fd = fs.openSync(path.join(newLangDirPath, `${locale}.js`), 'w');
    fs.writeSync(fd, languageFileText({ ...NAMES, locale, language }), 0, 'utf-8');
    fs.closeSync(fd);
  }

  /*******************************/
  /***** Create Action Files *****/
  /*******************************/
  fs.mkdirSync(newActionsDirPath);

  // action index
  fd = fs.openSync(path.join(newActionsDirPath, 'index.js'), 'w');
  fs.writeSync(fd, actionIndexFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  // action method
  fd = fs.openSync(path.join(newActionsDirPath, 'V1Example.js'), 'w');
  fs.writeSync(fd, actionFileText({ ...NAMES, method: 'V1Example' }), 0, 'utf-8');
  fs.closeSync(fd);

  /******************************/
  /***** Create Tasks Files *****/
  /******************************/
  fs.mkdirSync(newTasksDirPath);

  // tasks index
  fd = fs.openSync(path.join(newDirPath, 'tasks/index.js'), 'w');
  fs.writeSync(fd, taskIndexFileText(NAMES), 0, 'utf-8');
  fs.closeSync(fd);

  // tasks method
  fd = fs.openSync(path.join(newDirPath, 'tasks/V1ExampleTask.js'), 'w');
  fs.writeSync(fd, taskFileText({ ...NAMES, method: 'V1ExampleTask' }), 0, 'utf-8');
  fs.closeSync(fd);

  /******************************/
  /***** Create Mailers Files *****/
  /******************************/

  // make mailers directory
  fs.mkdirSync(newMailersDirPath);

  // create mailers folder and index file
  fs.mkdirSync(path.join(newMailersDirPath, `${pascalName}ExampleMail`));
  fd = fs.openSync(path.join(newMailersDirPath, `${pascalName}ExampleMail/index.ejs`), 'w');
  fs.writeSync(fd, mailFileText({ ...NAMES, method: `${pascalName}ExampleMail` }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Created ${newDirPath}`);

  /*****************************/
  /***** Create Test Files *****/
  /*****************************/

  // make tests directory
  fs.mkdirSync(newTestsDirPath);

  // create integration test files
  fs.mkdirSync(path.join(newTestsDirPath, 'integration'));
  fd = fs.openSync(path.join(newTestsDirPath, 'integration/V1Example.test.js'), 'w');
  fs.writeSync(fd, integrationTestFileText({ ...NAMES, method: 'V1Example' }), 0, 'utf-8');
  fs.closeSync(fd);

  // create background tasks test files
  fs.mkdirSync(path.join(newTestsDirPath, 'tasks'));
  fd = fs.openSync(path.join(newTestsDirPath, 'tasks/V1ExampleTask.test.js'), 'w');
  fs.writeSync(fd, tasksTestFileText({ ...NAMES, method: 'V1ExampleTask' }), 0, 'utf-8');
  fs.closeSync(fd);

  fs.closeSync(fs.openSync(path.join(newTestsDirPath, 'helper.test.js'), 'w'));
  // fs.closeSync(fs.openSync(path.join(newTestsDirPath, 'action.test.js'), 'w'));

  // make test/app directory
  // fs.mkdirSync(newTestAppDirPath);
  // fd = fs.openSync(path.join(newTestAppDirPath, 'index.js'), 'w');
  // fs.writeSync(fd, testFeatureIndexFileText({ ...NAMES, method: 'V1Example' }), 0, 'utf-8');
  // fs.closeSync(fd);

  // console.log(`Created ${newTestsDirPath}`);
  // console.log(`Created ${newTestsDirPath} and ${newTestAppDirPath}`);

  /******************************/
  /***** Update Sequence.js *****/
  /******************************/
  const sequenceArray = require('../database/sequence');

  // add new feature name
  sequenceArray.push(camelName);
  const featureNames = sequenceArray.map(name => `'${name}'`).join(',\n  ');

  fd = fs.openSync(path.join(__dirname, '../database/sequence.js'), 'w');
  fs.writeSync(fd, sequenceFileText(featureNames), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Added '${camelName}' to database/sequence.js\n`);

  // Finished
  console.log(`${newDir} feature generated!\n`);
} // END generate

/**
 * 1. Generate Action File
 * 2. Generate Integration Test File
 * 3. Update Action Index File
 */
function generateAction() {
  let newFileName = process.argv[5]; // FILE
  const featDir = process.argv[3]; // FEATURE
  const featDirPath = path.join(__dirname, featDir);
  const featActionsDirPath = path.join(featDirPath, 'actions');
  const featActionsIndexPath = path.join(featActionsDirPath, 'index.js');
  const featTestsDirPath = path.join(featDirPath, 'tests');

  console.log(`Generating ${newFileName} file in actions folder of ${featDir} feature...\n`);

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

  // remove .js
  newFileName = newFileName.indexOf('.js') < 0 ? newFileName : newFileName.split('.js')[0];

  // add .js
  const newFileNameJS = newFileName.indexOf('.js') < 0 ? `${newFileName}.js` : newFileName;
  const newFileNameTestJS = newFileName.indexOf('.js') < 0 ? `${newFileName}.test.js` : newFileName.split('.js')[0] + '.test.js';

  // names
  const upperName = featDir.toUpperCase();
  const lowerName = featDir.toLowerCase();
  const pascalName = featDir[0].toUpperCase() + '' + featDir.substring(1);
  const camelName = featDir[0].toLowerCase() + '' + featDir.substring(1);

  const NAMES = { upperName, lowerName, pascalName, camelName };

  // action file
  let fd = fs.openSync(path.join(featActionsDirPath, newFileNameJS), 'w');
  fs.writeSync(fd, actionFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Created ${path.join(featActionsDirPath, newFileNameJS)}`);

  // action test file
  fd = fs.openSync(path.join(featTestsDirPath, `integration/${newFileNameTestJS}`), 'w');
  fs.writeSync(fd, integrationTestFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Created ${path.join(featTestsDirPath, `integration/${newFileNameTestJS}`)}`);

  // update action index file
  let featActionIndexFileText = fs.readFileSync(featActionsIndexPath, 'utf8').replace(/ /g, '').replace(/\n/g, '').replace(/\t/g, ''); // grab file text and remove all spaces
  let requireActionFiles = featActionIndexFileText.substring(featActionIndexFileText.indexOf('module.exports')).split('{')[1].split('}')[0].split(','); // get all the actions
  let requireText = `...require('./${newFileName}')`; // the require code

  // remove [''] if th file does not have any require files (empty)
  if (requireActionFiles.length === 1 && requireActionFiles[0] === '') requireActionFiles = [];
  requireActionFiles.push(requireText);
  requireActionFiles = requireActionFiles.sort(); // sort alphabetically
  let requireActionFilesStr = requireActionFiles.join(',\n  ');
  fd = fs.openSync(path.join(featActionsIndexPath), 'w');
  fs.writeSync(fd, actionIndexFileText({ ...NAMES, actions: requireActionFilesStr }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Added "${requireText}" to ${path.join(featDirPath, `actions/index.js`)}\n`);
  console.log(`👉 Remember to update the following in ${featDir} feature:\n1. routes.js\n2. controller.js\n`);
} // END generateAction

/**
 * 1. Generate Mailers Folder
 * 2. Generate Mailer Mail Folder
 * 3. Generate Mailer Mail index.ejs
 */
function generateMail() {
  let newFileName = process.argv[5]; // FILE
  const featDir = process.argv[3]; // FEATURE
  const featDirPath = path.join(__dirname, featDir);
  const featMailersDirPath = path.join(featDirPath, 'mailers');
  let featMailersMailDirPath = path.join(featMailersDirPath, newFileName);

  // The feature folder must be pre-prepended to the Mailer Directory Name
  if (newFileName.indexOf(featDir) !== 0) featMailersMailDirPath = path.join(featMailersDirPath, `${featDir}${newFileName}`);

  const featMailersMailIndexPath = path.join(featMailersMailDirPath, 'index.ejs');

  console.log(`Generating ${newFileName} directory in mailers folder of ${featDir} feature...\n`);

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

  // names
  const upperName = featDir.toUpperCase();
  const lowerName = featDir.toLowerCase();
  const pascalName = featDir[0].toUpperCase() + '' + featDir.substring(1);
  const camelName = featDir[0].toLowerCase() + '' + featDir.substring(1);

  const NAMES = { upperName, lowerName, pascalName, camelName };

  // create mailer mail directory
  fs.mkdirSync(featMailersMailDirPath);
  console.log(`✅ Created ${featMailersMailDirPath}`);

  // mail index.ejs file
  let fd = fs.openSync(featMailersMailIndexPath, 'w');
  fs.writeSync(fd, mailFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Created ${featMailersMailIndexPath}`);
} // generateMail

/**
 * 1. Generate Task File
 * 2. Generate Task Test File
 * 3. Update Task Index File
 */
function generateTask() {
  let newFileName = process.argv[5]; // FILE
  const featDir = process.argv[3]; // FEATURE
  const featDirPath = path.join(__dirname, featDir);
  const featTasksDirPath = path.join(featDirPath, 'tasks');
  const featTestsDirPath = path.join(featDirPath, 'tests');
  const featTasksIndexPath = path.join(featTasksDirPath, 'index.js');

  console.log(`Generating ${newFileName} file in tasks folder of ${featDir} feature...\n`);

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

  // remove .js
  newFileName = newFileName.indexOf('.js') < 0 ? newFileName : newFileName.split('.js')[0];

  // add .js
  const newFileNameJS = newFileName.indexOf('.js') < 0 ? `${newFileName}.js` : newFileName;
  const newFileNameTestJS = newFileName.indexOf('.js') < 0 ? `${newFileName}.test.js` : newFileName.split('.js')[0] + '.test.js';

  // names
  const upperName = featDir.toUpperCase();
  const lowerName = featDir.toLowerCase();
  const pascalName = featDir[0].toUpperCase() + '' + featDir.substring(1);
  const camelName = featDir[0].toLowerCase() + '' + featDir.substring(1);

  const NAMES = { upperName, lowerName, pascalName, camelName };

  // task file
  let fd = fs.openSync(path.join(featTasksDirPath, newFileNameJS), 'w');
  fs.writeSync(fd, taskFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Created ${path.join(featTasksDirPath, newFileNameJS)}`);

  // task test file
  fd = fs.openSync(path.join(featTestsDirPath, `tasks/${newFileNameTestJS}`), 'w');
  fs.writeSync(fd, tasksTestFileText({ ...NAMES, method: newFileName }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Created ${path.join(featTestsDirPath, `tasks/${newFileNameTestJS}`)}`);

  // update tasks index file
  let featTaskIndexFileText = fs.readFileSync(featTasksIndexPath, 'utf8').replace(/ /g, '').replace(/\n/g, '').replace(/\t/g, ''); // grab file text and remove all spaces
  let requireTaskFiles = featTaskIndexFileText.substring(featTaskIndexFileText.indexOf('module.exports')).split('{')[1].split('}')[0].split(','); // get all the actions
  let requireText = `...require('./${newFileName}')`; // the require code

  // remove [''] if th file does not have any require files (empty)
  if (requireTaskFiles.length === 1 && requireTaskFiles[0] === '') requireTaskFiles = [];
  requireTaskFiles.push(`...require('./${newFileName}')`);
  requireTaskFiles = requireTaskFiles.sort(); // sort alphabetically
  let requireTaskFilesStr = requireTaskFiles.join(',\n  ');
  fd = fs.openSync(path.join(featTasksIndexPath), 'w');
  fs.writeSync(fd, taskIndexFileText({ ...NAMES, tasks: requireTaskFilesStr }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Added "${requireText}" to ${path.join(featDirPath, `tasks/index.js`)}\n`);
  console.log(`👉 Remember to update the following in ${featDir} feature:\n1. worker.js\n`);
} // END generateTask

/**
 * 1. Deletes Feature Folder and everything in it
 * 2. Updates database/sequence.js
 */
function destroy() {
  const rmDir = process.argv[3]; // NEW_FEATURE
  const rmDirPath = path.join(__dirname, rmDir);
  // const rmTestAppDirPath = path.join(__dirname, '../test/app', rmDir);
  const camelName = rmDir[0].toLowerCase() + '' + rmDir.substring(1);

  console.log(`Deleting ${rmDir} feature...\n`);

  // if directory exists
  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exists.`);
    process.exit(1);
  }

  // delete app/Feature
  fs.rmSync(rmDirPath, { recursive: true });
  console.log(`✅ Deleted ${rmDirPath}`);

  // delete test/app/Feature
  // fs.rmSync(rmTestAppDirPath, { recursive: true });
  // console.log(`Deleted ${rmTestAppDirPath}`);

  // remove feature name from database/sequence.js
  const sequenceArray = require('../database/sequence');
  sequenceArray.splice(sequenceArray.indexOf(camelName), 1);
  const featureNames = sequenceArray.map(name => `'${name}'`).join(',\n  ');

  // file descriptor
  let fd = fs.openSync(path.join(__dirname, '../database/sequence.js'), 'w');
  fs.writeSync(fd, sequenceFileText(featureNames), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Removed '${camelName}' from database/sequence.js\n`);

  // Finished
  console.log(`${rmDir} feature deleted!\n`);
} // END destroy

/**
 * 1. Deletes Action File
 * 2. Deletes Integration Test File
 * 3. Update Action Index File
 */
function destroyAction() {
  let rmFileName = process.argv[5]; // file name
  const rmDir = process.argv[3]; // NEW_FEATURE
  const rmDirPath = path.join(__dirname, rmDir);
  const rmActionsDirPath = path.join(rmDirPath, 'actions');
  const rmActionsIndexPath = path.join(rmActionsDirPath, 'index.js');
  const rmTestsDirPath = path.join(rmDirPath, 'tests');

  console.log(`Deleting ${rmFileName} action files...\n`);

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

  // remove .js
  rmFileName = rmFileName.indexOf('.js') < 0 ? rmFileName : rmFileName.split('.js')[0];

  // add .js
  const rmFileNameJS = rmFileName.indexOf('.js') < 0 ? `${rmFileName}.js` : rmFileName;
  const rmFileNameTestJS = rmFileName.indexOf('.js') < 0 ? `${rmFileName}.test.js` : rmFileName.split('.js')[0] + '.test.js';

  // names
  const upperName = rmDir.toUpperCase();
  const lowerName = rmDir.toLowerCase();
  const pascalName = rmDir[0].toUpperCase() + '' + rmDir.substring(1);
  const camelName = rmDir[0].toLowerCase() + '' + rmDir.substring(1);

  const NAMES = { upperName, lowerName, pascalName, camelName };

  // files to remove
  const rmActionsDirPathFile = path.join(rmActionsDirPath, rmFileNameJS);
  const rmTestsDirPathIntegrationFile = path.join(rmTestsDirPath, 'integration', rmFileNameTestJS);

  // if file exists
  if (!fs.existsSync(rmActionsDirPathFile)) {
    console.error(`Error: ${rmActionsDirPathFile} file does not exists.`);
    process.exit(1);
  }

  // delete action file
  fs.rmSync(rmActionsDirPathFile, { recursive: true });
  console.log(`✅ Deleted ${rmActionsDirPathFile}`);

  // delete test integration file
  fs.rmSync(rmTestsDirPathIntegrationFile, { recursive: true });
  console.log(`✅ Deleted ${rmTestsDirPathIntegrationFile}`);

  // update action index file
  let rmActionIndexFileText = fs.readFileSync(rmActionsIndexPath, 'utf8').replace(/ /g, '').replace(/\n/g, '').replace(/\t/g, ''); // grab file text and remove all spaces
  let requireActionFiles = rmActionIndexFileText.substring(rmActionIndexFileText.indexOf('module.exports')).split('{')[1].split('}')[0].split(','); // get all the actions
  let requireText = `...require('./${rmFileName}')`; // the require code
  requireActionFiles = requireActionFiles.filter(actionFile => actionFile.indexOf(requireText) < 0); // will filter out this the targeted file
  requireActionFiles = requireActionFiles.sort(); // sort alphabetically
  let requireActionFilesStr = requireActionFiles.join(',\n  ');
  let fd = fs.openSync(path.join(rmActionsIndexPath), 'w');
  fs.writeSync(fd, actionIndexFileText({ ...NAMES, actions: requireActionFilesStr }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Removed "${requireText}" from ${rmActionsIndexPath}\n`);
  console.log(`👉 Remember to update the following in ${rmDir} feature:\n1. routes.js\n2. controller.js\n`);
} // END destroyAction

/**
 * 1. Delete Mailer Mail index.ejs
 * 2. Delete Mailer Mail Directory
 */
function destroyMail() {
  let rmFileName = process.argv[5]; // FILE
  const rmDir = process.argv[3]; // FEATURE
  const rmDirPath = path.join(__dirname, rmDir);
  const rmMailersDirPath = path.join(rmDirPath, 'mailers');
  const rmMailersMailDirPath = path.join(rmMailersDirPath, rmFileName);

  console.log(`Deleting ${rmFileName} mailer files...\n`);

  // if directory exists
  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDirPath} feature does not exists.`);
    process.exit(1);
  }

  // must provide a file name
  if (!rmFileName) {
    console.error(`Error: Please pass in file name.`);
    process.exit(1);
  }

  // delete mailer mail file
  fs.rmSync(rmMailersMailDirPath, { recursive: true });
  console.log(`✅ Deleted ${rmMailersMailDirPath}`);
} // END destroyMail

/**
 * 1. Deletes Task File
 * 2. Deletes Task Test File
 * 3. Update Task Index File
 */
function destroyTask() {
  let rmFileName = process.argv[5]; // file name
  const rmDir = process.argv[3]; // NEW_FEATURE
  const rmDirPath = path.join(__dirname, rmDir);
  const rmTasksDirPath = path.join(rmDirPath, 'tasks');
  const rmTasksIndexPath = path.join(rmTasksDirPath, 'index.js');
  const rmTestsDirPath = path.join(rmDirPath, 'tests');

  console.log(`Deleting ${rmFileName} tasks files...\n`);

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

  // remove .js
  rmFileName = rmFileName.indexOf('.js') < 0 ? rmFileName : rmFileName.split('.js')[0];

  // add .js
  const rmFileNameJS = rmFileName.indexOf('.js') < 0 ? `${rmFileName}.js` : rmFileName;
  const rmFileNameTestJS = rmFileName.indexOf('.js') < 0 ? `${rmFileName}.test.js` : rmFileName.split('.js')[0] + '.test.js';

  // names
  const upperName = rmDir.toUpperCase();
  const lowerName = rmDir.toLowerCase();
  const pascalName = rmDir[0].toUpperCase() + '' + rmDir.substring(1);
  const camelName = rmDir[0].toLowerCase() + '' + rmDir.substring(1);

  const NAMES = { upperName, lowerName, pascalName, camelName };

  // files to remove
  const rmTasksDirPathFile = path.join(rmTasksDirPath, rmFileNameJS);
  const rmTestsDirPathTasksFile = path.join(rmTestsDirPath, 'tasks', rmFileNameTestJS);

  // if file exists
  if (!fs.existsSync(rmTasksDirPathFile)) {
    console.error(`Error: ${rmTasksDirPathFile} file does not exists.`);
    process.exit(1);
  }

  // delete tasks file
  fs.rmSync(rmTasksDirPathFile, { recursive: true });
  console.log(`✅ Deleted ${rmTasksDirPathFile}`);

  // delete test tasks file
  fs.rmSync(rmTestsDirPathTasksFile, { recursive: true });
  console.log(`✅ Deleted ${rmTestsDirPathTasksFile}`);

  // update action index file
  let rmTaskIndexFileText = fs.readFileSync(rmTasksIndexPath, 'utf8').replace(/ /g, '').replace(/\n/g, '').replace(/\t/g, ''); // grab file text and remove all spaces
  let requireTaskFiles = rmTaskIndexFileText.substring(rmTaskIndexFileText.indexOf('module.exports')).split('{')[1].split('}')[0].split(','); // get all the actions
  let requireText = `...require('./${rmFileName}')`; // the require code
  requireTaskFiles = requireTaskFiles.filter(actionFile => actionFile.indexOf(requireText) < 0); // will filter out this the targeted file
  requireTaskFiles = requireTaskFiles.sort(); // sort alphabetically
  let requireTaskFilesStr = requireTaskFiles.join(',\n  ');
  let fd = fs.openSync(path.join(rmTasksIndexPath), 'w');
  fs.writeSync(fd, taskIndexFileText({ ...NAMES, tasks: requireTaskFilesStr }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`✅ Removed "${requireText}" from ${rmTasksIndexPath}\n`);
  console.log(`👉 Remember to update the following in ${rmDir} feature:\n1. worker.js\n`);
} // END destroyTask

/**
 * Takes in a file path and stringifies it to help with writing the generate and delete functions above
 * You should put in arguments in the format ${variable} so we can just copy and paste it into this file
 */
function stringify() {
  const filePath = process.argv[3]; // the file path of the file to stringify
  let fileText = fs.readFileSync(filePath, 'utf8');
  fileText = fileText.replace(/\n/g, '\\n').replace(/`/g, '\\`'); //.replace(/\${/g, '\\${');

  // print out result
  console.log(`\n${fileText}\n`);
} // END stringify
