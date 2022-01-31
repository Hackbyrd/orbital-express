/**
 * Compiles Mailes and Languages
 *
 * yarn add gulp-cli gulp --dev --exact
 *
 * Run "yarn gulp" in command line terminal
 */

 'use strict';

 // third-party node modules
 const gulp = require('gulp');
 const compile = require('./mailers/compile');
 const language = require('./services/language.js');

 // Languages
 gulp.task('languages', done =>{
   language.compile();

   console.log('Language locales generated.');
   done();
 });

 // Languages watch for changes
 gulp.task('languages:watch', done => {
   gulp.watch(['./languages/*.js', './app/**/languages/*.js'], gulp.series('languages'));
   done();
 });

 // Mailers
 gulp.task('mailers', async () => {
   await compile().catch(err => {
     console.error(err);
     process.exit(1);
   });

   console.log('Email previews generated.');
   return Promise.resolve();
 });

 // Mailers watch for changes
 gulp.task('mailers:watch', done => {
   gulp.watch('./mailers/**/index.ejs', gulp.series('mailers'));
   done();
 });

 // run all tasks
 gulp.task('default',
   gulp.series('mailers', 'mailers:watch', 'languages', 'languages:watch', done => {
     console.log('Gulp finished');
   })
 );
