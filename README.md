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

> yarn s

<br/>

Either of these commands run the worker.js file. This file runs the background jobs. What's a background job? You can think of it as way to run code that may take longer to process compared to a normal API request or a task you just want to run in the background, outside of a normal API request. So for example, what if you need to generate a report and it could take up to 5 mins to generate because of just how intensive the task is. Instead of writing an API request to do this task, you write the function to process this task in on the background job server. This way, once it's completed, we can notify the correct parties that the task is complete.
> yarn worker
<br/>

> yarn w

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
<br/>
### More on .env.staging and .env.production<br/>
In practice, you don't actually need to store the .env.staging and .env.production config files in your local development. It is optional. The only use case where you should store these files on your local computer is if you ever want to connect directly to your staging or production servers and run the code locally on your computer. For example, you could run a /scripts file on your local computer using the .env.production config and it should connect to your production database directly. You might want to do this if you need to run a quick fix via a script. Also, it is important to note that staging and production are basically the same thing. We just call it staging because you can't name two files .env.production on your local computer. In reality, when you deploy to a service like Heroku or AWS, they treat all deployments as a production environment, and there is no such thing as a staging environment. Again everything is a production environment when you deploy. We just call it staging to help us not get confused between the two environments ourselves since we are choosing one production app to be our staging / testing app and the other production app to be the main app we launch for users to use.
<br/>

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
This file may be misleading, because its a .sql file. Are we uploading this to PostgreSQL as our database schema? NO, we are not. This is purely for our notes and we should record ANY changes to the database here. You can think of this file are our master database schema plan for the entire application. However, the actual place where we modify the database is in the **migrations** folder. It is **strongly** recommended that you make updates here whenever you make a database change and you take notes on all the columns and tables so that yourself and future developments can view one file and understand what is going on in your application. I understand the trades off to doing this is maintaining a file when you can just go off of the models files. If you want to do that, you will be shooting yourself in the foot as the app gets more complex and you start to deal with hundreds of tables and thousands of columns. Since every new engineer you onboard will be jumping around your app like a monkey trying to grab his banana. Maintain this file and you will move faster and your futureself plus future engineers will thank you.

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
This file you don't really need to modify because it is updated automatically when you generate or destroy a feature via the commands we will highlight in the next section (**yarn gen** or **yarn del**). Basically, if you open up the file, you will see that its an array of all the existing tables. The order of the elements in this array matter a lot. This is because when we upload seed data OR fixture data (for testing), there are table foreign keys and dependencies. For example, what if you have two tables called "Company" and "User" and a "User" belongs to a "Company". You have to add the "Company" seed data/fixtures first before you add the "User" seed data/fixtures. Please don't modify this file unless you have to manually override something.

<br />

---
## The App Directory and Features
<br/>
Below is an example of what a FeatureFolder contains. This is where you will spend most of your development time on. 

```
- FeatureFolder
  - actions
    - index.js
    - action1.js
    - action2.js
  - languages
      - en.js
      - es.js
  - mailers
      - ExampleEmail
        - index.ejs
        - preview.html
      - ExampleEmail2
        - index.ejs
        - preview.html
  - tasks
      - index.js
      - task1.js
      - task2.js
  - tests
    - integration
      - action1.test.js
      - action2.test.js
    - tasks
      - task1.test.js
      - task2.test.js
    - helper.test.js
  - controller.js
  - error.js
  - helper.js
  - model.js
  - routes.js
  - worker.js
```

### The General Workflow
The goal of having this feature folder structure is to make sure we create a repeatable process when developing new features or making updates to features. When you break it down, what is a backend API actually doing? We are essentially creating a layer of code that just connects to a database and makes updates to that database. We generally do this in two ways. 
<br/><br/>
The first way is a direct action that is made via an HTTP/HTTPS request from the client-side frontend, or in other words, an API request. Naturally, if we want to build an action that updates the feature folder, we can create an update action and place that in the actions folder. In this flow, after the req object is passed in through all the middleware that was defined in the server.js (remember the order matters) it then hits the feature folder code, starting with the routes.js, then the req object is passed to the controller.js, in the controller, we figure out which action is called and then return a response. That is the general lifecycle of an API request. Majority of your development will go through this flow.
<br/><br/>
The second way is instead of making changes and updates via an API request, we can also create background jobs via adding jobs to a queue. We do this if we know we need to perform a task in the background. The best example of this is when we need to do something that takes longer to process, like exporting a list of 1,000,000 records from the database or running some complex math algorithm that may take hours. If you tried to do this via an API request (the first method explained), the client-side (the end-user) might have to wait a long time before they get the response back from the request they made. So in this scenario, it is better to respond quickly to their request and state that we are processing their request via a background task and when it is done, we will notify the end-user via a notification by email, phone, or socket push. It is important to also note that there are two ways we can trigger a background job. The first way is what was just described, you can have an API request create a background job in the action itself, just like the example above for exporting a large dataset. The second way is to trigger it is via a cronjob (we explain what a cronjob is earlier above). An example is you can set up a cronjob to create a background job every set period of time to do some task such as resetting inventory for a restaurant on a daily basis. In this flow, everytime a background job is created either in an action or via a cronjob, it goes through the worker.js to figure out which task to run and then  that task is called.

<br/><br/>

## Let's Explore Each Section More In-Depth

### Model.js
When you create a feature folder, it is **strongly** recommended that it is tied to a database table. You **should not** create a feature folder without it relating to an actual database table. This is bad practice and defeats the purpose of this entire structure.<br/>
The purpose of this file is to define the table attributes and column attributes of this table and its columns in order for us to take full advantage of using this table in our ORM (Sequelize). You will notice, in every file that we need to make database changes, we include the global models.js. The global models.js will include and compile all the local feature folder model.js files so we can modify any database table / col. In this file, you will define the table name, its columns, its foreign keys and its relationship with other tables. Unlike the migrations file, this file can be constantly updated, where as the migrations file cannot be edited once deployed since it is modifying the database directly. Please note, we are just defining the model.js so we can avoid writing RAW .sql code and instead us the ORM to make changes to the database in our code instead. Once again, the migrations files directly modify the database whereas the model.js is only used in the ORM. One awesome thing you could do is add helper methods in this file that is directly tied to this feature folder model and you can call this method via the ORM.

### Routes.js
The purpose of this file is to define the routes for this feature folder. You will notice we include the controller at the top of the file. This is because we want to make sure we are calling the correct controller method for each route. Therefore, each route should correspond to an action in the controller. We define a route via the following pattern / convention: <br/>
```
router.all('/version/feature_folder_name_plural/action_name', controller.VersionAction);
```

example:
```
router.all('/v1/admins/login', controller.V1Login);
```
As you can see above, this route is a version 1 route, we can add future versions like a v2 later. The reason why we define version is because as you build and maintain your API, you will eventually have to upgrade or make updates to your endpoints but you still want to keep the old API routes so older legacy code on the front-end or users of your older API endpoints won't feel the need to upgrade immediately. This allows you to maintain multiple versions of your API as you undergo a steady deprecation process. In the route you also will notice we are working in the admin feature folder. Remember, we pluralize admins here as a standard practice. Lastly, we add the action name without the versioning. Keep in mind our route convention is all lowercase and no spaces, dashes, or underscores. So if you had to have two words like UpdateOrders it would appear as '/v1/admins/updateorders' <br/><br/>
Just a reminder, all the feature folder routes will get aggregated and add to the global routes.js file.
<br/><br/>

### Controller.js
The purpose of this file is to "control" which action is being called by what route and whether or not the req.user object has the correct permissions to access an action. At the top of the file, we include the actions/index.js file. This file is special because it aggregrates all the actions in the one main file to include in the controller so we don't have to manually include every new action to the controller when it is added. If you did not know, in node.js if you just include a folder, it will automatically look for an index.js file in the folder as default. That is why we name the file index.js. Again, by doing this, we are able to access all the actions to be used in the controller file without having to manually include all the actions.<br/><br/>
The controller file is also where we define the permissions for each action. We do this by adding the following line of code to the action:
```
/* which method to call */

// if admin user type
if (req.admin)
  method = `V1ActionNameByAdmin`;
// if user user type
else if (req.user)
  method = `V1ActionNameByUser`;
else
  return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

/* example with roles */
if (req.admin.role === 'ADMIN')
  method = `V1ActionNameByAdminAdmin`;
// if user user type
else if (req.user.role === 'SUPERADMIN')
  method = `V1ActionNameByUserSuperAdmin`;
else
  return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

/* example with client device (iOS) and user roles */
if (req.device.type === 'ios') {
  if (req.admin)
    method = `V1ActionNameByAdminOniOS`;
  // if user user type
  else if (req.user.role === 'SUPERADMIN')
    method = `V1ActionNameByUserSuperAdminOniOS`;
}

// default action
else {
  return method = `V1ActionName`;
}

```
As you can see from the examples above, in the controller method, we are specifically checking for user types, roles for a user type, or client-side devices and then calling the correct action method approprietly. This is a very powerful feature because it allows us to have one action method that can be used for multiple user types, roles, or client-side devices. This is extremely important because the behavior of your action may differ slightly or significantly depending on the user type, role or device. You'll also notice we have a specific naming convention for the action methods. We use the following naming convention: <br/>
```
// VersionNumberActionNameByUserTypeRoleOnDevice
V1UpdateByUserManagerOniOS

// V1 = version name
// Update = action name
// By = denotes by which user type and / or role
// User = user type (admin or user or whatever you have defined as a user type)
// Manager = role (admin, superadmin, manager, etc) for that user type
// On = denotes by which client-side device
// iOS = client-side device (iOS, Android, Web, etc). This is optional and if no included, it will default to all devices

```
We are able to define the action method name in a very descriptive way so we know exactly what the action method is doing and who it is for. The file name of the action is also the same as the action method name but with just the VersionNumber and the ActionName. Then we defined the more granular methods inside the file. For example, if the filename of the example above would just be V1Update.js found in the actions folder.
<br/><br/>
Last thing to note is that in the controller method, in the last section, we take the result of the action that was called and either return the response or error in JSON form. If we throw an error, we immedietly move on to the next middleware, which is the error middleware found in the global middleware folder. If we don't throw an error, we just return the response.

### Actions Folder
We store all the actions in this folder. Every actions folder has an index.js that we include only once in the controller.js file. In the actions/index.js file we include all the actions here and this is automatically updated if you use our yarn commands
```
// Generate action: yarn gen FeatureFolder -a ActionName
yarn gen Admin -a V1Login

// Delete action: yarn del FeatureFolder -a ActionName
yarn del Admin -a V1Login
```
This will automatically create the action file and add it to the index.js file. This is a very powerful feature because it allows us to add/remove actions very quickly and easily. The action file name, as mentioned previously in the controller section, is the same as the action method name but with just the VersionNumber and the ActionName. Then we defined the more granular methods inside the file. For example, if the filename of the example above would just be V1Login.js found in the actions folder.
<br/><br/>
Inside the action file, we will write the meat of the action. This is where we will write the logic for the action. Let us use the feature folder Order and the action V1Update as an example. The first thing we need to think about is what user types and/or roles can perform such action. Let's say both Admin user type and User user type can perform this action. So we will create two methods in the action file. One for Admin user type and one for User user type.
<br/><br/>
**Important Note**: It is Highly recommended that you DO NOT try to stuff all logic into one method using if/else statements to distiguish betweem the two user types. It is much better to create two methods and call the correct method in the controller file. This is because it is much easier to read and understand what the action is doing. It is also much easier to debug and test as the methods change overtime and there are more and more differences between the two. As the methods get more and more complex, you do not want to edit the one method trying to make a change for one user type but accidentally breaking the other user type. It is much better to have two methods and make the changes to the correct method. This is a very important concept to understand and follow.
<br/><br/>
We will name the methods as follows:
```
// update by admin
async function V1UpdateByAdmin(req) {}

// update by user
async function V1UpdateByUser(req) {}
```

We can even create more methods if you want to get more granular such as roles and device types as highlighted in the controller section. But for now, let's just stick with the two methods above. Now we need to think about what the action is actually doing. In this case, we are updating an order. If there are many similarities (shared code) between the two methods, you can write a helper method in the helper.js file in the feature folder and call that helper method in both methods. Another thing you can do is call a common more general method like the one below:
```
// common shared method called by both V1UpdateByAdmin and V1UpdateByUser
async function V1Update(req) {}
```
In this example, you can write your custom logic in V1UpdateByAdmin to handle the admin user type and then call the more general method V1Update and passing in any needed params. You can do the same for the V1UpdateByUser. This allows you to share code between methods and not have to repeat yourself.
<br/><br/>
### Actions Folder Structure: Deep Dive<br/><br/>
When using yarn gen, the action file is automatically created for you with a pre-filled structure and template. Please follow it religiously.
```
// 1. at the top we have a comment header that describes what the action is doing
/**
 * ADMIN V1Read ACTION
 */

// 2. then we have the 'use strict' statement
// this enables JavaScript's strict mode. JavaScript's strict mode was introduced in ECMAScript 5. It enforces stricter parsing and error handling on the code at runtime. It also helps you write cleaner code and catch errors and bugs that might otherwise go unnoticed.
'use strict'; 

// 3. then we have native node modules (built into node.js so you don't need to install these) that we are importing
// built-in node modules
const fs = require('fs'); // built in node.js file system module
// add more modules here

// 4. then we have third-party node modules, we "yarn install" this third party modules
// third-party
const stripe = require('stripe'); // stripe api

// 5. then we have services that we created ourselves that we import from the global services folder
// services
const queue = require('../../../services/queue'); // process background tasks from Queue

// 6. then we have the helper methods that we created ourselves that we import from the both the global helpers folder and the feature folder helpers folder
// helpers
const { LIST_STRING_REGEX } = require('../../../helpers/constants');
const { someMethod } = require('../helpers');

// 7. then we have the models that we created ourselves that we import from the both the global models folder
// models
const models = require('../../../models');

// 8. next and this is extremely important, we write the module.exports and list out ALL the methods we will define in this file. 
// methods
module.exports = {
  V1ReadByAdmin,
  V1ReadByUser,
};
```
DO NOT do the following two things: <br/>
1. Do not define the actual function instead of this module.export {}. <br/>
2. Do no export each method individually on the same line you define the function. See below the example of what to do and what not to do and I'll explain why.<br/><br/>

:white_check_mark: Here is an example of what you should do. Notice that module.exports defines the methods first and THEN we write the actual methods below. We do this BECAUSE as the file gets bigger and bigger, it is much easier to find the methods you are looking for. It may not seem like a problem now but as the codebase gets more complex and files get to be thousands of lines and you are debugging or figuring out how something works, it is much easier to find the method you are looking for if you have all the methods defined at the top of the file. This is extremely important.
```
// put at top of file
module.exports = {
  V1ReadByAdmin,
  V1ReadByUser,
};

// define methods after exporting
async function V1ReadByAdmin(req) {}
async function V1ReadByUser(req) {}
```

:x: Don't do this, again because it makes it difficult to see immediately what methods are defined in this file as the file gets longer and longer.
```
// DO NOT export and define methods at the same time
module.exports = {
  V1ReadByAdmin: async function(req) {},
  V1ReadByUser: async function(req) {},
};
```
:x: Also, don't do this, once again because it makes it difficult to see immediately what methods are defined in this file as the file gets longer and longer.
```
// DO NOT export and define methods at the same time
export const V1ReadByAdmin = async (req) => {}
export async function V1ReadByUser(req) => {}
```
Alright, sorry that we got sidetracked, let's continue with the rest of the file structure.
```
// 9. Next we start to define the methods. You can define as many as you want. We'll just go through one method for now. The first thing we do is write the standarized comment header.
/**
 * Read and return an admin (description of method)
 *
 * GET  /v1/admins/read (method and route)
 * POST /v1/admins/read (method and route)
 *
 * Use req.__('') or res.__('') for i18n language translations (DON'T require('i18n') since it is already attached to the req & res objects): https://github.com/mashpie/i18n-node
 * 
 * Must be logged in (describes what roles are allowed for this method)
 * Roles: ['admin']
 *
 * req.params = {} (describes the params that are allowed for this method)
 * (what arguments are allowed for this method)
 * req.args = {
 *   @id - (NUMBER - OPTIONAL) [DEFAULT - req.admin.id]: The id of an admin
 * }
 *
 * Success: Return a admin. (describes what is returned if the method is successful)
 * Errors: (describes what errors can be returned if the method fails)
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */

// 10. Next we define the actual method. This method is called in the controller, we pass in the request and response object.
async function V1Read(req, res) {

  // 11. The first thing we should always do and define a schema to check and validate the req.args coming in from the client-side request. We use the joi library to do this. We define the schema and then we validate the req.args against the schema. If there is an error, we return an error response. If there is no error, we continue on with the method.
  const schema = joi.object({
    id: joi.number().min(1).default(req.admin.id).optional()
  });

  // 12. we run the joi validation against the req.args and if there is an error, we return the error
  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  // 13. the joi validation library allows us to convert the variable types to the correct type. For example, if the client-side sends in a string '5' for the id, the joi library will convert it to a number 5. This is very useful because we don't have to worry about converting the variable types ourselves. We can just use the req.args.id variable and it will be the correct type.
  req.args = value; // arguments are updated and variable types are converted to correct type. ex. '5' -> 5, 'true' -> true

  // 14. this is where we write the core logic for this method. We can call other methods, we can call the database, we can call other services, etc. Usually we should wrap it in a try/catch if it involves calling the database or other services.
  try {
    // find admin
    const findAdmin = await models.admin.findByPk(req.args.id, {
      attributes: {
        exclude: models.admin.getSensitiveData() // remove sensitive data
      }
    });

    // check if admin exists
    if (!findAdmin)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

    // 15. if the method is successful, we return a success response in an object format. We can also return any data we want to return to the client-side but we must ALWAYS have the status and success keys in the response.
    return {
      status: 200,
      success: true,
      admin: findAdmin.dataValues
    };
  } catch (error) {
    // 16. Lastly, if any errors occur, we catch it and simply throw the error. The error will be caught in the controller and passed to the error middleware and then the error will be returned to the client-side in a format that is defined in the global services/error.js file. Format: { status, success, error, message }. Notice it also has the status and success keys just like if it was successful.
    throw error;
  }
} // END V1Read

// 17. we can add more methods here with that follow the same format

```
The actions folder is where we write the majority of our backend logic so get familiar with the structure. If you follow these convention, the codebase will become extremely easy to follow and maintainable over time no matter how many engineers come and go. It is very very very important that this structure is followed.
<br/><br/>

### Tests Folder
### Worker.js
### Tasks Folder
### helper.js
This file is very self explanatory. Just add any helper methods that are specific to this feature folder here.
### error.js
### Mailers Folder
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
We need a way to effectively create emails with good developer experience. That's what the mailers directory is for. Let's dive deeper into what the process looks like.

### Global vs Feature Folder Mailers
Just like routes, controllers, models, and actions, the mailers are also segmented into each feature folder as well under the **mailers** directory. In addition, we have global **mailers** directory that includes the mailer folders. Each mailer folder follows the following structure:

```
- mailers
  - Mailerfolder1
    - index.ejs
    - preview.html
  - Mailerfolder2
    - index.ejs
    - preview.html
  - Mailerfolder3
    - index.ejs
    - preview.html
```

The **index.ejs** is the actual html file that contains the code for the email. There are two things that you must note, the first is that we put in the comments above, what arguments we are passing into the email template. The second, we always have a test code html line displayed just so we know when an email is a test email or not. The variable is called **locals.isTestEmail**.

The **preview.html** is autogenerated by the **gulpfile.js**. This generates a preview of the email html so you can view it in a browser more easily. You will NOT see a preview.html if you do not run the **gulpfile.js**.

Lastly, because we are autogenerating the **preview.html**, when you insert the variables, you need to check if it exists by calling **locals.[INSERT_VARIABLE]** and then placing a default value if it does not exist. This is only for testing purposes when the **preview.html** is generated. If you do not have put a default variable, the gulpfile will throw an error.

<br/>

---
## Migrations
Migrations, although similar to models, are different in that they are used to create and update database tables. Remember models are used when we are actually coding and does not change the database whatsoever. We use the [sequelize](https://sequelize.org/) library to manage our migrations. The migrations are located in the **migrations** directory.<br/><br/>

There are two instances when we need to generate a model.
1. When we are creating a new table run the following command:
```
yarn model
```
After the file is generated in the migrations/ folder, rename it to the following format listed below<br/><br/>
2. When we are updating an existing table, most of the time we are adding a new column or index.
```
yarn migration
```
After the file is generated in the migrations/ folder, rename it to the following format listed below
<br/>
Note: We do not use migrations to delete columns & tables, or update column & table names because we may need to rollback (undo) any changes if things go wrong and we still want the original data to be there. If we delete a column or table, we will lose that data. So in the case we need to update a column name for example, we will create a new column with the new name, copy the data from the old column to the new column, and then delete the old column much later on when we have verfied that the migration and all application updates went smoothly. This way we can rollback if we need to in emergency situations.<br/>

When naming the migration file, we follow the following convention:
```
// For creating a new table (model)
Format: DATE-create-MODEL_NAME_SINGULAR-model.js
Example: 20230609205440-create-Admin-model.js

// For updating existing table columns
Format: DATE-add-cols-COL_ONE_NAME-and-COL_TWO_NAME-to-TABLE_NAME_PLURAL-tbl.js
Example: "20230703230712-add-cols-refundedByAdminId-and-refundedByPartnerId-to-OrderRefunds-tbl.js"

// For adding an index to table
Format: DATE-add-index-COL_ONE_NAME_COL_TWO_NAME-to-TABLE_NAME_PLURAL-tbl.js
Example: "20230703230712-add-index-refundedByAdminId_refundedByPartnerId-to-OrderRefunds-tbl.js"
```

I want to emphazie it is VERY important to follow this format because we are documenting in the filename what colums and tables are being created or updated. This is very helpful as we create hundreds if not thousands of migrations over the years because at a glance we can always look back and instantly know what the migration is doing. If you do not follow this format, you will suffer the conseqences of searching through hundreds of files to find what you are looking for (often time potential bugs).
<br/><br/>
Last thing I want to highlight is that in the migraiton file you are encourage to manupulate the data of the columns directly if you need to when creating new columns. For example, let's say you have an existing column called "age" and you want to add a new column called "doubleAge" and you want to populate the "doubleAge" column instantly in the migration so that you don't have to write a script to do it later or you need to be populated right when it is created (it is set to NOT NULL) for the application to work. It is highly recommended to write a sequelize query in the migration file after you create the column. In that extra sql command, you look at the "age" column and just multiple by two and populate the "doubleAge" column. Again, you can do this directly in the migration file.

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
