The locales folder is used to housed the compile *.json files. These files SHOULD NOT be edited because they are auto-generated.

The program that compiles these *.json files can be found in services/language.js file in the compile() method.

All the *.json files are in .gitignore

These files are auto-generated every time the server is started whether its in development, production, or testing enviroment