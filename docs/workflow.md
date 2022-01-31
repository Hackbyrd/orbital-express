Add New Feature
1. Write Schema in [database/Schema.sql](database/Schema.sql)
2. Generate Feature
  2-1. Go to Terminal, type in "yarn gen FOLDERNAME" (folder name is singular)
3. Write Model
  3-1. Copy schema from schema.sql to paste on top of the model.js page as comment
  3-2. Replace all example1, example2 with field name, and corresponding field attributes (skip all foriegn keys in this step)
  3-3. Add any foreign key statements before last "return" statement
  3-4. If there is any unique combination, insert the following inside Index, and change the field names to corresponding unique-key
      {
        unique: true,
        fields: ['locationId', 'sessionId']
      }
  3-5. Check if anything breaks. Go to Terminal, type in "yarn s"
4. Generate Migration
  4-1. Go to Terminal, type in "yarn model"
  4-2. Go to "migrations" folder, rename the file that was just created. Change the word "new" to the new Table (singular) name. Follow the same case in naming
  4-3. Open up the migration file, change the type of ID from INTEGER to BIGINT
  4-4. Change all words "NewModels" to the table (plural) name
  4-5. Delete all examples
  4-6. Copy and paste field name object from model js over to migration file
  4-7. Change the word DATATYPE to Sequelize throughout document
  4-8. Add in any foreign key from model js, but place those below ID object (remember to change the table name if applicable)
  4-9. For unique index, if any, add the following statement at the end of the field object
        .then(() => {
            return queryInterface.addConstraint('SessionSettings', ['locationId', 'sessionId'], {
              type: 'unique'
            });
          }).then(() => {
            return done();
          }).catch(err => { console.log(err); return done(); });
  4-10. If added the statement for unique index, add "done" as a third param on top after "up: (queryInterface, Sequelize,"
  4-11. Check if anything breaks. Go to Terminal, type in "yarn migrate"
5. Write Routes
  5-1. Determine the type of things doing (create, update, query etc)
  5-2. Type in "router.all('/sessionsettings/create', controller.V1Create);", remove and rename as necessary. Plural in naming
6. Write Controller
  6-1. Put the three methods from Routes in between the brackets afteer module.exports
  6-2. Create function after the module.exports, the actual function will go into action.js
7. Write Action
  7-1. In each function, add the parameters in between brackets in the following statements:
    const schema = {
      sessionId: joi.string().trim().required(),
      locationId: joi.number().integer().min(1).required()
    }
  7-2. models.MODELNAME.find ==> the last part is function to be performed in sequel. Choices are "findOne", "findById", "findAllAndCount", "create", "update", "destroy"
  7-3. Go to Terminal, type "yarn s" to see if there is any error
8. Write Tests
  8-1. Go to folder: