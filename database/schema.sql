-- DATABASE TABLES --

-- Table names are plural and PascalCase
-- Table column names are camelCase
-- ENUM names are ALL CAPS WITH NO UNDERSCORES, SPACES OR DASHES
-- ENUM values are ALL CAPS WITH UNDERSCORES AND NO SPACES AND NO DASHES

-- ALL TIMES ARE IN UTC OFFSET 0

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
  deletedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  createdAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updatedAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
