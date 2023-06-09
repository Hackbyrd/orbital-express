-- DATABASE TABLES CONVENTIONS --

-- Table names are plural and PascalCase
-- Table column names are camelCase
-- ENUM names are ALL CAPS WITH NO UNDERSCORES, SPACES OR DASHES
-- ENUM values are ALL CAPS WITH UNDERSCORES AND NO SPACES AND NO DASHES

-- ALL TIMES ARE IN UTC OFFSET 0

------------------------------------- TABLE TEMPLATE -------------------------------------------
-- Examples TABLE --
-- Description: The description of what table is for, tablename must be plural --
CREATE TYPE EXAMPLETYPE AS ENUM ('ONE', 'TWO', 'THREE'); -- ENUM SHOULD BE ALL CAPS
CREATE TABLE IF NOT EXISTS Examples (
  -- 1. Primary Key --
  id BIGSERIAL PRIMARY KEY NOT NULL,

  -- 2. Foreign Keys --
  otherTableId BIGINT NOT NULL REFERENCES OtherTables(id), -- plural, can't be null
  otherTable2Id BIGINT DEFAULT NULL REFERENCES OtherTables2(id), -- plural, can be null

  -- 3. Third-Party Vendor IDs, should have vendor name prepended --
  auth0Id STRING DEFAULT NULL,
  stripeId STRING DEFAULT NULL,
  twilioId INT DEFAULT NULL,

  -- 4. Customized Columns --
  col1 INT NOT NULL DEFAULT 1,
  col2 STRING NOT NULL UNIQUE, -- 256 characters
  col3 TEXT DEFAULT NULL,
  col4 BOOLEAN NOT NULL DEFAULT TRUE,
  col5 EXAMPLETYPE DEFAULT 'ONE', -- ENUM, should be declared above this table
  col6 TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  col7 JSON NOT NULL DEFAULT '{"key":"value"}',

  -- 5. Autogenerated by Sequelize
  deletedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  createdAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updatedAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
); -- END Examples TABLE

------------------------------------------------------------------------------------------------

-- ADMINS TABLE --
CREATE TABLE IF NOT EXISTS Admins (
  id BIGSERIAL PRIMARY KEY NOT NULL,
  timezone STRING NOT NULL DEFAULT 'UTC',
  locale STRING NOT NULL DEFAULT 'en',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  name STRING NOT NULL,
  email STRING NOT NULL UNIQUE,
  phone STRING DEFAULT NULL,
  salt TEXT NOT NULL, -- random salt value
  password TEXT NOT NULL, -- hashed password
  passwordResetToken TEXT DEFAULT NULL UNIQUE,
  passwordResetExpire TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  acceptedTerms BOOLEAN NOT NULL DEFAULT TRUE, -- whether this admin accepted our terms / services
  loginCount INT NOT NULL DEFAULT 0,
  lastLogin TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,

  -- Autogenerated by Sequelize
  deletedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  createdAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updatedAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- USERS TABLE --
CREATE TYPE SEXTYPE AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TABLE IF NOT EXISTS Users (
  id BIGSERIAL PRIMARY KEY NOT NULL,
  timezone STRING NOT NULL DEFAULT 'UTC',
  locale STRING NOT NULL DEFAULT 'en',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  name STRING NOT NULL,
  email STRING NOT NULL UNIQUE,
  phone STRING DEFAULT NULL,
  sex SEXTYPE DEFAULT NULL,
  salt TEXT NOT NULL, -- random salt value
  password TEXT NOT NULL, -- hashed password
  passwordResetToken TEXT DEFAULT NULL UNIQUE,
  passwordResetExpire TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  emailConfirmed BOOLEAN NOT NULL DEFAULT FALSE,
  emailConfirmationToken TEXT DEFAULT NULL UNIQUE,
  emailResetToken TEXT DEFAULT NULL UNIQUE,
  resetEmail TEXT DEFAULT NULL, -- must check email if this email already exists both when this is created and when this is about to change email
  acceptedTerms BOOLEAN NOT NULL DEFAULT TRUE, -- whether this user accepted our terms / services
  loginCount INT NOT NULL DEFAULT 0,
  lastLogin TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,

  -- Autogenerated by Sequelize
  deletedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  createdAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updatedAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);