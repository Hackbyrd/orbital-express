# Welcome to Orbital-Express
A better way to organize and develop on your express.js node application. Built for developers who need a more opinionated structure for their express.js applications and for helping engineering teams scale their developer experience.
<br/><br/>
## Important
### Orbital-Express assumes you already have the base foundation of JavaScript, node.js and express.js
- Use node.js v16.x.x
- Use express.js v5.x.x
- Knowledge of ES6 and Advanced JavaScript is highly **recommended**

[View Markdown Cheatsheet](https://www.markdownguide.org/cheat-sheet)
<br/><br/>

---
## Before You Begin
Please go through ["docs/setup.txt"](docs/setup.txt) to set up your environment. Once set up, you'll be able to run the server and tests.
<br/><br/>

---
## Getting Started
This opinionated framework was built and modeled after two of the most famous web frameworks in the world, Python/Django and Ruby on Rails. The combined Django's feature-based development with Ruby on Rails Model-View-Controller concept. We believe together, they make a really solid structure. **This guide assumes you have some experience in building API/web applications and understand the basic flow of an API. Ideally, you should have some experience with other web frameworks.**
<br/><br/>

### Feature-Based Development / Structure (Django's Approach)
If you don't know what this means, let me explain. To put it simply, when we build out a new feature, we group everything (routes, controller, actions, models, tests etc..) that is related to that feature into one **"Feature Folder"**. In our case, all **"Feature Folders"** can be found under the **"app/"** directory (more on this later). By contrast, popular frameworks like Ruby on Rails separate their the code out by model, view, route, test and controller folders and within those folders contain the feature-related files. See below.

:white_check_mark: Here is an example of a Feature-Based structure:
```
- orbital-express
  - app
    - FeatureFolder1
      - controller.js
      - model.js
      - routes.js
      - test.js
    - FeatureFolder2
      - controller.js
      - model.js
      - routes.js
      - test.js
    - FeatureFolder3
      - controller.js
      - model.js
      - routes.js
      - test.js
```

:x: Here is an example of Ruby on Rails Structure:
```
- orbital-express
  - controllers
    - feature1.js
    - feature2.js
    - feature3.js
  - models
    - feature1.js
    - feature2.js
    - feature3.js
  - routes
    - feature1.js
    - feature2.js
    - feature3.js
  - tests
    - feature1.js
    - feature2.js
    - feature3.js
```

### Wait, What is a Feature Exactly?
You can think of a **Feature** as just a database table. For example, let's say you want to add a new table in the database called **"Orders"**. So naturally after we create that table, the next step is to create API methods around it such as, **Read**, **Create**, **Update**, **Delete**, and **Query** methods. As you can see, you are beginning to design the actions that are related to "Orders". During this implementation process, you will need to create API routes, models, controllers, and the action itself as well as tests surrounding those actions. Therefore, you could say you are working on the **"Orders"** feature. Everytime you create a new database table, you are essentially about to work on a new **"Feature Folder"**. We'll go more in detail of all the folders that are included in a Feature Folder later on in this guide.

### Why Feature-Based Is Better
The main reason why feature-based is better is because it allows developers to work and focus on one selected feature, without potentially overlapping with other developers working on other features. This way you will run into less merge conflicts and confusion. Additionally, as your codebase because very large and you start to have 100s of features, you will find the Ruby on Rails approach to be extremely difficult to navigate around in your code editor, because you'll be jumping back and forth and scrolling up and down between the folders, thereby wasting so much time and adding to your frustration. Having the all the code related to a single feature grouped together into one folder allows for a better developer experience as the project scales in terms of number of files and folders.
<br /><br />
Now that we gotten that out of the way, let's continue learning more about how this framework operates.
<br /><br />

---
## The Entry Points (index.js, worker.js, cronjobs.js)
Every app needs an entry point. In our case, the file that kicks everything off and starts this web server is **"index.js"**. But wait there's more. This framework was also build to support a background worker server via **"worker.js"** and a cronjob process via **"cronjobs.js"**. Why? Because every app will eventually need background jobs and cronjobs (more details below). To get the app up and running, you will need to start all three servers. Run the following commands below:

<br/>

Either of these commands run the index.js file. This file runs the actually web server to process any API requests coming in.
> yarn server
<br/>
yarn s

<br/>

Either of these commands run the worker.js file. This file runs the background jobs. What's a background job? You can think of it as way to run code that may take longer to process compared to a normal API request or a task you just want to run in the background, outside of a normal API request. So for example, what if you need to generate a report and it could take up to 5 mins to generate because of just how intensive the task is. Instead of writing an API request to do this task, you write the function to process this task in on the background job server. This way, once it's completed, we can notify the correct parties that the task is complete.
> yarn worker
<br/>
yarn w

<br/>

This command runs the cronjob.js file. What is a cronjob? You can think of it as a task that is triggered by time. Basically you are scheduling a task to occur at a certain time. For example, let's say you want your app to send out an email to all the users on their daily account details every day at 12pm noon. You would create a cronjob to do this because it is being executed at a certain time. Quick hint, its common to use cronjobs and background jobs together. In the example with the daily account details, you would create a cronjob that gets triggered every day at 12pm. That cronjob would then create a background task that will actually do the processing of the details needed and send that information to the user.
> yarn cron

<br/>

---
## index.js / server.js
As mentioned previously, the **"index.js"** file is the entry point to run the web server. If you dive deeper into the code, you will find that we setting up a server cluster so that we can spin up a new server for every CPU process there is on the server. We are using the node module **"throng"** to help us achieve this concurrency. The actual server can be found in the file **"server.js"**. You can see we reference server.js in the index.js code.

<br />

### Server.js and Middlewares Explained
The server.js file is where the actual server is created and configured, including all the middlewares we want to include in our API. If you look at the code, you'll notice we are using many third-party node modules. These modules are actually added to our server as **middleware** via
> app.use()

What is middleware? To understand this, we must think of the lifecycle of an API request.

<br />

Incoming API Request (req) > middleware1(req) > middleware2(req) > middleware3(req) > Outgoing Response back to client giving them the result of their request.

<br />
A middleware is just a component (function/method) that you pass the request object of the API request to. It performs an action and it may or may not update the request object. After if performs its action, it then calls the next middleware (component) down the chain until there is nothing left to call, in which case, that's when a response is returned.

<br/>

The middleware lifecycle can simply be thought of as just passing in a request object down a chain of functions until there are no functions left to call, in which case, we return the final result (response) back to the web client (Front-End).

<br/>

We won't explain all the server.js middleware node modules that we included, but please note that the **order** of the middlewares that are being added matters because it reflects in what order the incoming request object is being processed. In server.js, the last middleware that runs is the routes middleware, but if dig deeper into the routes files of each **"Feature Folder"**, the next middleware down the chain is the controller, then in the controller, the actions will be called, then after the actions, we either return an error (if this is the case, the error middleware will be called) or we return success (in this case there are no more middlewares left to execute so we return the response/result of the request back to the client).

<br/>

---
## Custom Middlewares
We have a ##"middleware"## folder where you can add your own custom middlewares. We already created a few in which case you can check out the files individually and read the comments to understand what they do.

[middleware/args.js](middleware/args.js)<br />
[middleware/auth.js](middleware/auth.js)<br />
[middleware/error.js](middleware/error.js)<br />
[middleware/exit.js](middleware/exit.js)

<br/>

The most important one to know is the **"args.js"** file. In short, we create and append a variable to the **req** object called **req.args**. This variable contains the request body IF it is a POST request, or the request query IF it is a GET request. We do this because you as the developer don't need to know or remember if the API request you are working on is a POST or a GET. All you need to know is that the arguments are going to be attach to **req.args** so you can focus on building your feature.

---
## The Config Folder / Environment Set Up
When building any application, its common to have variables be different depending on what environment we are in. There are four main environments that we have:

<br />

- Production
- Staging
- Development
- Test

Each of these environments will have their own set of config variables containing sensitive information like API keys, secret keys, etc. that can be used across the entire application codebase. By default, we provide a file called
> .env.template

This can be found under the **config** folder. It is up to you to create your own config files for each environment you need. The following is an example of what we recommend creating in the config folder:

- config
  - .env.development
  - .env.production
  - .env.staging
  - .env.test

You should copy the contents of the **.env.template** and create the files above and paste the copied content into the newly created config file. Then fill in all the config variables. The **.env.development**, **.env.production**, **.env.staging** and **.env.test** files are added to the .gitignore for security reasons and therefore **WILL NOT** show up on github. This is because you don't want other random people getting access to your important API keys and variables. Every time you add a new config variable, we recommend updating the **.env.template** file because this will be included in the git repository and any new developers who pull your changes or develop on your project can add the correct config variables need to run your project servers.

### config/config.js
In the **config** folder you'll find another file called **config.js**. This file is used to configure our ORM, Sequelize's migration tool. In short, it's the configuration to all the Sequelize-CLI to connect to the database to run migrations. Please note, that we have to configure this AGAIN in the **database/index.js** file seperately. We will go into more detail on in the **Database Folder / Configuration** section below.

### heroku-sync.js
In heroku, you need to add the config variables manually and sometimes this can be very time consuming and this process may be prone to errors. So we created the **heroku-sync.js** file to sync your **config/.env.production** or your **config/.env.staging** file to your deployed app on heroku with a single command. Example below.

> node ./config/heroku-sync .env.production orbital-express-api true

Please check out [config/heroku-sync.js](config/heroku-sync.js) for more details.

<br/>

---
## Database Folder / Configuration
In the **database** folder, there are few important things to note.

1. The Set Up via index.js
2. The Schema via schema.sql
3. The Backups via backups folder
4. The Seed Data via seed folder
5. The Ordering of the table creation via sequence.js

<br />

### 1 .The Set Up via index.js
**index.js** is where we set up the configuration for the API server to connect to the database. As mentioned earlier, if you remember, we also connect to the database in the **config/config.js** file but for a different reason, the sequelize migrations. By contrast, the **database/index.js** is configuration sequelize ORM for the actual web app API server. You need to have both set up correctly.

<br />

### 2. The Schema via schema.sql
This file may be misleading, because its a .sql file. Are we uploading this to PostgreSQL as our database schema? NO, we are not. This is purely for our notes and we should record ANY changes to the database here. You can think of this file are our master database schema plan for the entire application. However, the actual place where we modify the database is in the **migrations** folder.

<br />

### 3. The Backups via backups folder
One thing we find ourselves doing very often is backing up the database, whether its for development purposes or just to keep a backup somewhere. That's what this folder is for. To store any backup. We have a built in command to make this very easy.

> yarn backup

Yes, that's it. It will make of backup of the current database and store it in this **database/backups** folder automatically. You can find the actual command in the **package.json** "scripts" section. Try it out!

<br />

But having a backup isn't enough, we also need a way to restore it back to the actual database. Dont' worry, we have a command for that as well.

> yarn restore

This will drop the current database and replace it with the backup. You can also find this command in the **package.json** "scripts" section.

<br/>

### 4. The Seed Data via seed folder
This is the folder where we put our seed data for our development database. We will also have a seperate seed data folder (called fixtures) for tests but more on that later one. What is seed data? Basically, seed data is data we create ahead of time in the form of a JavaScript object so that we can load that data into the database instead of manually creating it over and over again via API requests. You can think of it as a template or a snapshot of data we want to have in our development database.

The structure of the seed data folder is the following:

- database
  - seed
    - set1
      - table1
      - table2
      - table3
    - set2
      - table1
      - table2
      - table3

You might be asking, "what is a set"? A set folder is just there to help you separate out different versions of what data you want to upload in the database.

**Best Practices**: <br />
I do recommend not creating so many different **"sets"**. Just create a few with the bare minimum, otherwise you'll find yourself trying to update all the sets every time you add a new table or column into the database.

<br />

### 5. The Ordering of the table creation via sequence.js
This file you don't really need to tough because it is updated automatically when you generate or destroy a feature via the commands we will highlight in the next section (**yarn gen** or **yarn del**). Basically, if you open up the file, you will see that its an array of all the existing tables. The order of the elements in this array matter a lot. This is because when we upload seed data OR fixture data (for testing), there are table foreign keys and dependencies. For example, what if you have two tables called "Company" and "User" and a "User" belongs to a "Company". You have to add the "Company" seed data/fixtures first before you add the "User" seed data/fixtures. Please don't modify this file unless you have to manually override something.

<br />

---
## The App Directory and Features

### Model.js
### Routes.js
### Controller.js
### Actions Folder
### Tests Folder
### Worker.js
### Tasks Folder
### helper.js
### error.js
### Languages Folder

<br/>

---
## Global Services
The **services** directory is where you put your own wrappers on any third-party APIs you are using. We created commonly use files already such as email.js and error.js. We **HIGHLY RECOMMEND** writing your own wrappers instead of directly using these API node modules direectly in your main code. This is because you should be de-coupling your third-party code instead of directly using it in your platform. The reason why you do this is so your app is not soley dependent on this library/service you are using and you can easily switch it out in the future. Also it makes it easier to modify and test.

1. email.js
2. error.js
3. language.js
4. socket.js

<br/>

---
## Global Languages / Locales

<br/>

---
## Global Helpers
The **helpers** directory is where you should place all your global helper methods that are used acrosse your entire application. This is different from the Feature's helper.js file which stores helper methods that are only relevant to that feature folder. We already wrote some global helper files for you including the [helpers/constants.js](helpers/constants.js) file. This file houses ALL the **GLOBAL** constant variables used in the applications. Thus, you should be adding any new or custom varibles you want to add to this file if you want them to be used globally.

1. constants.js
2. cruqd.js
3. logic.js
4. tests.js
5. validate.js

<br/>

---
## Global Tests
The **test** directory is the entry point to run tests. When you run

> yarn test

you are essentially running all the tests in this **test** directory. There are four directories

1. app
2. fixtures
3. helpers
4. services

### app directory
The app directory doesn't really have code in it. If you read the [test/app/README.txt](test/app/README.txt) file, you'll find that we are running [test/app/index.js](test/app/index.js) to stitch together all the test files from the app feature folders. We do this because as we described in the beginning of this guide, we want to break up the app by feature and not by type of file. So we are able to write tests in their corresponding feature folder, instead of placing all the tests in this test folder.

### fixtures
The fixtures directory is similar to the database/seed directory but instead of loading data into the development database, we are loading test data into the test database. We follow the same structure as the database/seed but instead of having **"set"** folders, we have **"fix"** folders containing the javascript files that mirror the database tables. Lastly, you'll find an **"assets"** folder here. This folder is just to place any assets (images, files, videos, etc...) to be used in the tests.

### helpers and services
The last two folders are just there for you to place the tests for the global helpers and global services. Name the test file after the file you are trying to test. It's as simple as that. You are NOT testing the feature folder helpers here. This is only for the GLOBAL helpers and services.

<br/>

---
## Mailers
We need a way to effectively create emails with good developer experience. That's what they mailers directory is for. Let's dive deeper into what the process looks like.

<br/>

---
## Custom Scripts
This is where you place any custom script you want to write. It may or may not be related to this application. For example, if you want to scrap data or perform a one time database operation, put the script in this folder.

<br/>

---
## The Gulpfile
The [gulpfile.js](gulpfile.js) is a service that is running in the background. When running, it is constantly watching for changes in certain files in order to perform specific tasks as a response to those changes.

To run the gulpfile run this
> yarn gulp

Our gulpfile specifically watches for the following:
1. If we make changes to the mailers index.ejs files, it will re-compile and update the preview.html
2. If we make changes to the languages JavaScript files, it will re-compile and update the locales JSON files.

You can add your own custom watches if you want.

<br/>

---
## Deploying to Heroku
The framework was built to work with Heroku's ecosystem. Do the follow to get this app deployed on heroku.

1. Create a Heroku app
2. Add Heroku PostgreSQL database package
3. Add Heroku Redis database package
4. Add config variables, either manually or using the config/heroku-sync.js
5. Connect your project's Github's main branch to this Heroku app.
6. Click Deploy.
7. Add a custom domain name with SSL certificate (Optional)

Basically, all you have to do is push to main branch and then click deploy and it will automatically deploy. The main server, the worker server and the cronjobs server will automatically deploy and any migration will run automatically. We set this up in the [Procfile](Procfile) for Heroku to know what we want to deploy.

<br/>

---
## More Documentation

<br />

### Conventions
Please read the [docs/conventions.txt](docs/conventions.txt) file to get a better understanding of the best pratices and conventions we are using throughout the application.

<br />

### Built-In Command Line Commands
Please read [docs/commands.txt](docs/commands.txt) file to see what commands you can use to save you time on writing boilerplate code and just executing certain actions without remembering the specific commands.

<br/>
