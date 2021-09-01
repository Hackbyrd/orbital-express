/**
 * Syncs the config variables of your app that is hosted on Heroku.
 * !Important: You must first log into heroku via the command line.
 * !Important: Only do this if you have authorization to modify the config variables on Heroku because you are expliciting overriding and updating the variables on your production app.
 *
 * Run:
 * node ./config/heroku-sync .env.[production|staging] heroku-app-name isFirstSync
 */

'use strict';

// require built-in node modules
const fs = require('fs');
const { exec } = require('child_process');

module.exports = {
  genTemplate,
  updateConfig
};

/**
 * Updates your heroku config variables for an app from a .env file in the config folder.
 *
 * Arguments: accepts both command line arguments and parameters
 * Ex: node ./config/heroku-sync .env.[production|staging] heroku-app-name first
 *
 * @envFile (STRING - REQUIRED): the path of the .env file [.env.production] or [.env.staging]
 * @appName (STRING - REQUIRED): the name of the heroku app you want to update the config variables for
 * @isFirstSync (STRING BOOLEAN - OPTIONAL): if any value is passed in, then we know this is the first time we are setting configuration variables, otherwise if no value is passed in, we reset and override current config variables.
 */
function genTemplate(envFile = __dirname + '/' + process.argv[2], appName = __dirname + '/' + process.argv[3], isFirstSync = process.argv[4] || null) {
  // it is the first time we are setting config, so don't reset and clear existing configuration
  if (isFirstSync) return updateConfig(envFile, appName);

  // views the current heroku configuration
  exec('heroku config -a ' + appName, (error, stdout, stderr) => {
    if (error) return console.error(`exec error: ${error}`);

    // saves the existing config to an array
    stdout = stdout.substring(stdout.indexOf('\n') + 1);
    const config = stdout.split('\n').map(line => line.substring(0, line.indexOf(':')));
    const unset = config.join(' ');

    // clears the values of all existing configuration keys
    exec('heroku config:unset ' + unset + ' -a ' + appName, (error, stdout, stderr) => {
      if (error) return console.error(`exec error: ${error}`);

      updateConfig(envFile, appName);
    });
  });
}

// Reads the .env file and updates the heroku configuration
function updateConfig(envFile, appName) {
  fs.readFile(envFile, 'utf8', (err, data) => {
    if (err) return console.log(err);

    // skips comments and blank lines
    const arr = data.split('\n').filter(line => line.substring(0, 1) !== '#' && line.length !== 0);
    const cmd = arr.join(' ');

    // sends the new configuration to heroku
    exec('heroku config:set ' + cmd + ' -a ' + appName, (error, stdout, stderr) => {
      if (error) return console.error(`exec error: ${error}`);

      console.log(`\n\nstdout: \n${stdout}`);
      console.log(`stderr: \n${stderr}`);
    });
  });
}

genTemplate();
