# Welcome to Orbital-Express
A better way to organize and develop on your express.js node application. Built for developers who need a more opinionated structure for their express.js applications and for helping engineering teams scale their developer experience.
<br/><br/>
## Important
### Orbital-Express assumes you already have the base foundation of JavaScript, node.js and express.js
Use node.js v16.x.x
Use express.js v5.x.x
Knowledge of ES6 and Advanced JavaScript is highly **recommended**

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

<br/>

---
## What is middleware and how it works?

<br/>

---
## The Config Folder / Environment Set Up

<br/>

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
## Database Folder / Configuration

<br/>

---
## Services

<br/>

---
## Global Languages / Locales

<br/>

---
## Mailers


<br/>

---
## Deploying to Heroku


<br/>

---
## Global Helpers


<br/>

---
## Custom Scripts


<br/>

---
