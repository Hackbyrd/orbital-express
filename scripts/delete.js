/**
 * DELETE FEATURE SCAFFOLD
 *
 * Removes a feature folder or a single scaffold file (action, task, mailer) and
 * keeps the related index files and database/sequence.js in sync.
 *
 * Usage (run from project root):
 *   node scripts/delete.js [FEATURE]
 *   node scripts/delete.js [FEATURE] action|-a [ACTION_FILE]
 *   node scripts/delete.js [FEATURE] task|-t   [TASK_FILE]
 *   node scripts/delete.js [FEATURE] mail|-m   [MAILER_FOLDER]
 *
 * Yarn shortcuts (add to package.json scripts):
 *   yarn del [FEATURE]
 *   yarn del [FEATURE] action|-a [ACTION_FILE]
 *   yarn del [FEATURE] task|-t   [TASK_FILE]
 *   yarn del [FEATURE] mail|-m   [MAILER_FOLDER]
 *
 * !IMPORTANT: Feature name must be singular and PascalCase.
 */

'use strict';

// built-in modules
const fs = require('fs');
const path = require('path');

// project root — this script lives in scripts/, one level below the root
const ROOT = path.join(__dirname, '..');

// argv positions when called as: node scripts/delete.js <Feature> [subtype] [file]
const featureArg = process.argv[2]; // e.g. 'Booking'
const subtypeArg = process.argv[3]; // e.g. 'action', '-a', 'task', '-t', 'mail', '-m', or undefined
const fileArg    = process.argv[4]; // e.g. 'V1Cancel' (only for action/task/mail subtypes)

if (!featureArg) {
  console.error('\nError: Please provide a feature name.\n  Usage: node scripts/delete.js [Feature]\n');
  process.exit(1);
}

// dispatch
switch (subtypeArg) {
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

// ---------------------------------------------------------------------------
// Index file text helpers — must stay in sync with app/feature.js equivalents
// ---------------------------------------------------------------------------

function actionIndexFileText({ upperName, actions }) {
  return `/**\n * ${upperName} ACTION\n *\n * Aggregates all action method files to be exported here\n * !NOTE: This file is updated automatically using the feature gen/del commands and is sorted alphabetically\n */\n\n'use strict';\n\nmodule.exports = {${actions === undefined ? "\n  ...require('./V1Example')\n" : actions ? `\n  ${actions}\n` : '' }}\n`;
}

function taskIndexFileText({ upperName, tasks }) {
  return `/**\n * ${upperName} TASK\n *\n * Aggregates all background task files to be exported here\n * !NOTE: This file is updated automatically using the feature gen/del commands and is sorted alphabetically\n */\n\n'use strict';\n\nmodule.exports = {${tasks === undefined ? "\n  ...require('./V1ExampleTask')\n" : tasks ? `\n  ${tasks}\n` : '' }}\n`;
}

function sequenceFileText(featureNames) {
  return `/**\n * This is the table order in which test fixture and seed data is added into the database.\n * Make sure to do MODEL NAME (Lower-case & Singular)!!! DO NOT DO TABLE NAME (Pascal-case & Plural)\n */\n\n'use strict';\n\nmodule.exports = [${featureNames ? '\n  ' : ''}${featureNames}${featureNames ? '\n' : ''}];\n`;
}

// ---------------------------------------------------------------------------
// Name derivation helper
// ---------------------------------------------------------------------------

function deriveNames(dir) {
  return {
    upperName: dir.toUpperCase(),
    lowerName:  dir.toLowerCase(),
    pascalName: dir[0].toUpperCase() + dir.substring(1),
    camelName:  dir[0].toLowerCase() + dir.substring(1),
  };
}

// ---------------------------------------------------------------------------
// destroy — delete entire feature folder + remove from database/sequence.js
// ---------------------------------------------------------------------------

/**
 * 1. Deletes app/<Feature> folder and everything in it
 * 2. Removes the entry from database/sequence.js
 */
function destroy() {
  const rmDir     = featureArg;
  const rmDirPath = path.join(ROOT, 'app', rmDir);
  const { camelName } = deriveNames(rmDir);

  console.log(`Deleting ${rmDir} feature...\n`);

  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exist at ${rmDirPath}.`);
    process.exit(1);
  }

  // delete app/<Feature>
  fs.rmSync(rmDirPath, { recursive: true });
  console.log(`Deleted ${rmDirPath}`);

  // remove entry from database/sequence.js
  const sequencePath  = path.join(ROOT, 'database', 'sequence.js');
  const sequenceArray = require(sequencePath);
  const idx = sequenceArray.indexOf(camelName);
  if (idx !== -1) sequenceArray.splice(idx, 1);
  const featureNames = sequenceArray.map(n => `'${n}'`).join(',\n  ');

  const fd = fs.openSync(sequencePath, 'w');
  fs.writeSync(fd, sequenceFileText(featureNames), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Removed '${camelName}' from database/sequence.js\n`);
  console.log(`${rmDir} feature deleted!\n`);
} // END destroy

// ---------------------------------------------------------------------------
// destroyAction — delete action file + integration test + update actions/index.js
// ---------------------------------------------------------------------------

/**
 * 1. Deletes app/<Feature>/actions/<ActionFile>.js
 * 2. Deletes app/<Feature>/tests/integration/<ActionFile>.test.js
 * 3. Removes the entry from app/<Feature>/actions/index.js
 */
function destroyAction() {
  if (!fileArg) {
    console.error('Error: Please provide an action file name.\n  Usage: node scripts/delete.js [Feature] action [ActionFile]');
    process.exit(1);
  }

  const rmDir      = featureArg;
  const rmDirPath  = path.join(ROOT, 'app', rmDir);
  const NAMES      = deriveNames(rmDir);

  // strip .js if present
  const rmFileName    = fileArg.endsWith('.js') ? fileArg.slice(0, -3) : fileArg;
  const rmFileNameJS  = `${rmFileName}.js`;
  const rmFileNameTestJS = `${rmFileName}.test.js`;

  const rmActionsDirPath  = path.join(rmDirPath, 'actions');
  const rmActionsIndexPath = path.join(rmActionsDirPath, 'index.js');
  const rmTestsDirPath    = path.join(rmDirPath, 'tests');
  const rmActionFile      = path.join(rmActionsDirPath, rmFileNameJS);
  const rmTestFile        = path.join(rmTestsDirPath, 'integration', rmFileNameTestJS);

  console.log(`Deleting ${rmFileName} action files...\n`);

  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exist.`);
    process.exit(1);
  }

  if (!fs.existsSync(rmActionFile)) {
    console.error(`Error: ${rmActionFile} does not exist.`);
    process.exit(1);
  }

  // delete action file
  fs.rmSync(rmActionFile, { recursive: true });
  console.log(`Deleted ${rmActionFile}`);

  // delete integration test file (soft — warn if missing, don't abort)
  if (fs.existsSync(rmTestFile)) {
    fs.rmSync(rmTestFile, { recursive: true });
    console.log(`Deleted ${rmTestFile}`);
  } else {
    console.warn(`Warning: test file not found, skipping: ${rmTestFile}`);
  }

  // update actions/index.js — remove the require entry
  const rawIndex = fs.readFileSync(rmActionsIndexPath, 'utf8').replace(/ /g, '').replace(/\n/g, '').replace(/\t/g, '');
  let requireActionFiles = rawIndex.substring(rawIndex.indexOf('module.exports')).split('{')[1].split('}')[0].split(',');
  const requireText = `...require('./${rmFileName}')`;
  requireActionFiles = requireActionFiles.filter(f => f.indexOf(requireText) < 0).sort();
  const requireActionFilesStr = requireActionFiles.join(',\n  ');

  const fd = fs.openSync(rmActionsIndexPath, 'w');
  fs.writeSync(fd, actionIndexFileText({ ...NAMES, actions: requireActionFilesStr }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Removed "${requireText}" from ${rmActionsIndexPath}\n`);
  console.log(`Remember to update the following in ${rmDir} feature:\n1. routes.js\n2. controller.js\n`);
} // END destroyAction

// ---------------------------------------------------------------------------
// destroyTask — delete task file + task test + update tasks/index.js
// ---------------------------------------------------------------------------

/**
 * 1. Deletes app/<Feature>/tasks/<TaskFile>.js
 * 2. Deletes app/<Feature>/tests/tasks/<TaskFile>.test.js
 * 3. Removes the entry from app/<Feature>/tasks/index.js
 */
function destroyTask() {
  if (!fileArg) {
    console.error('Error: Please provide a task file name.\n  Usage: node scripts/delete.js [Feature] task [TaskFile]');
    process.exit(1);
  }

  const rmDir      = featureArg;
  const rmDirPath  = path.join(ROOT, 'app', rmDir);
  const NAMES      = deriveNames(rmDir);

  // strip .js if present
  const rmFileName    = fileArg.endsWith('.js') ? fileArg.slice(0, -3) : fileArg;
  const rmFileNameJS  = `${rmFileName}.js`;
  const rmFileNameTestJS = `${rmFileName}.test.js`;

  const rmTasksDirPath   = path.join(rmDirPath, 'tasks');
  const rmTasksIndexPath = path.join(rmTasksDirPath, 'index.js');
  const rmTestsDirPath   = path.join(rmDirPath, 'tests');
  const rmTaskFile       = path.join(rmTasksDirPath, rmFileNameJS);
  const rmTestFile       = path.join(rmTestsDirPath, 'tasks', rmFileNameTestJS);

  console.log(`Deleting ${rmFileName} task files...\n`);

  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exist.`);
    process.exit(1);
  }

  if (!fs.existsSync(rmTaskFile)) {
    console.error(`Error: ${rmTaskFile} does not exist.`);
    process.exit(1);
  }

  // delete task file
  fs.rmSync(rmTaskFile, { recursive: true });
  console.log(`Deleted ${rmTaskFile}`);

  // delete task test file (soft — warn if missing, don't abort)
  if (fs.existsSync(rmTestFile)) {
    fs.rmSync(rmTestFile, { recursive: true });
    console.log(`Deleted ${rmTestFile}`);
  } else {
    console.warn(`Warning: test file not found, skipping: ${rmTestFile}`);
  }

  // update tasks/index.js — remove the require entry
  const rawIndex = fs.readFileSync(rmTasksIndexPath, 'utf8').replace(/ /g, '').replace(/\n/g, '').replace(/\t/g, '');
  let requireTaskFiles = rawIndex.substring(rawIndex.indexOf('module.exports')).split('{')[1].split('}')[0].split(',');
  const requireText = `...require('./${rmFileName}')`;
  requireTaskFiles = requireTaskFiles.filter(f => f.indexOf(requireText) < 0).sort();
  const requireTaskFilesStr = requireTaskFiles.join(',\n  ');

  const fd = fs.openSync(rmTasksIndexPath, 'w');
  fs.writeSync(fd, taskIndexFileText({ ...NAMES, tasks: requireTaskFilesStr }), 0, 'utf-8');
  fs.closeSync(fd);

  console.log(`Removed "${requireText}" from ${rmTasksIndexPath}\n`);
  console.log(`Remember to update the following in ${rmDir} feature:\n1. worker.js\n`);
} // END destroyTask

// ---------------------------------------------------------------------------
// destroyMail — delete mailer folder (and everything in it)
// ---------------------------------------------------------------------------

/**
 * 1. Deletes app/<Feature>/mailers/<MailerFolder> and everything inside it
 */
function destroyMail() {
  if (!fileArg) {
    console.error('Error: Please provide a mailer folder name.\n  Usage: node scripts/delete.js [Feature] mail [MailerFolder]');
    process.exit(1);
  }

  const rmDir           = featureArg;
  const rmDirPath       = path.join(ROOT, 'app', rmDir);
  const rmMailersDirPath = path.join(rmDirPath, 'mailers');
  const rmMailerMailDir  = path.join(rmMailersDirPath, fileArg);

  console.log(`Deleting ${fileArg} mailer...\n`);

  if (!fs.existsSync(rmDirPath)) {
    console.error(`Error: ${rmDir} feature does not exist.`);
    process.exit(1);
  }

  if (!fs.existsSync(rmMailerMailDir)) {
    console.error(`Error: ${rmMailerMailDir} does not exist.`);
    process.exit(1);
  }

  fs.rmSync(rmMailerMailDir, { recursive: true });
  console.log(`Deleted ${rmMailerMailDir}\n`);
} // END destroyMail
