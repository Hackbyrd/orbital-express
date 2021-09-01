PLEASE READ!

This models folder is used to help with generating new models via migrations.
Specifically, we need this folder here so we can trick Sequelize in generating all the models without needing to put all the models in this folder.
Instead, we are placing each feature's model inside their corresponding app/FEATURE folder and the models.js file compiles them all together to add the models to the sequelize instance.

This folder should be EMPTY except for this file.
