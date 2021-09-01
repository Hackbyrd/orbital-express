/**
 * This file is the Main Entry Point for this web application
 * This file runs the app server in a cluster.
 */

 'use strict';

 // built-in node modules
 const os = require('os');

 // third-party node modules
 const throng = require('throng'); // concurrency

 // env variables
 const NODE_ENV = process.env.NODE_ENV || 'development';
 const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
 const PROCESSES = NODE_ENV === 'production' ? process.env.WEB_CONCURRENCY || os.cpus().length : 1; // number of cores

 // function to start app
 async function startApp(processId) {
   const models = require('./models'); // get models
   const { gracefulExit } = require('./middleware/exit'); // exit

   // create server
   const server = require('./server'); // get app

   // Print Process Info
   console.log(`WEB process.pid: ${process.pid}`);
   console.log(`WEB process.env.NODE_ENV: ${NODE_ENV}`);

   // to check if database connection is established
   await models.db.authenticate().catch(err => {
     console.error(err);
     process.exit(1);
   });

   // listen server
   server.listen(PORT, () => {
     console.log(`Process ID: ${processId} - Server started on port ${PORT}`);

     // On terminate command: killall node or process.kill(process.pid)
     process.on('SIGTERM', () => {
       console.log(`Process ${processId} exiting...`);

       // gracefully exit server
       gracefulExit(server);
     });
   });
 }

 // run concurrent workers
 // throng({
 //   workers: PROCESSES, // Number of workers (cpu count)
 //   lifetime: Infinity, // ms to keep cluster alive (Infinity)
 //   grace: 5000 // ms grace period after worker SIGTERM (5000)
 // }, startApp);
 throng({
   worker: startApp,
   count: PROCESSES, // Number of workers (cpu count)
   lifetime: Infinity, // ms to keep cluster alive (Infinity)
   grace: 5000 // ms grace period after worker SIGTERM (5000)
 });