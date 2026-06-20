/**
 * Reusable Joi schemas shared across multiple actions.
 *
 * Convention:
 *   - Every export must be suffixed with "Schema" (e.g. addressSchema, phoneSchema).
 *   - Only add a schema here if it is used in more than one action. One-off schemas
 *     stay inline inside the action's Joi validation block.
 *   - Schemas are returned as functions so callers can chain .required()/.optional()
 *     at the point of use — do NOT add .required() or .optional() inside this file.
 *   - Compose shared schemas into action-level schemas via .keys() or direct embedding.
 */

'use strict';

// third-party modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

module.exports = {
  addressSchema,
  geocodeSchema,
  phoneSchema,
  dateSchema,
  emailSchema,
  uuidSchema,
  passwordSchema,
  paginationSchema,
  numberComparisonSchema
};

/**
 * The address model schema
 *
 * address = {
 *   address1: '14000 Saddle River Drive',
 *   address2: 'APT 2',
 *   city: 'Potomac',
 *   state: 'MD',
 *   postalCode: '20878',
 *   countryCode: 'US',
 * }
 */
function addressSchema() {
  return joi.object().keys({
    address1: joi.string().trim().uppercase().min(1).max(128).required(),
    address2: joi.string().allow('').allow(null).trim().uppercase().min(0).max(64).optional(), // allow '' empty string
    address3: joi.string().allow('').trim().uppercase().min(0).max(64).optional(), // allow '' empty string
    city: joi.string().trim().uppercase().min(1).required(),
    state: joi.string().trim().uppercase().min(2).max(2).required(),
    postalCode: joi.string().trim().min(3).required(),
    countryCode: joi.string().trim().uppercase().min(2).required(),
  }); // dont put required() or optional() because it will be handled by the parent schema
}

/**
 * The geocode model schema
 *
 * geocode = {
 *   lat: 37.18374859,
 *   lng: -122.18374859,
 *   alt: 75.1757751
 * }
 */
function geocodeSchema() {
  return joi.object().keys({
    lat: joi.number().required(),
    lng: joi.number().required(),
    alt: joi.number().required(),
  }); // dont put required() or optional() because it will be handled by the parent schema
}

/**
 * The phone model schema for E.164 format
 *
 * E.164 format requires:
 * - Starts with a '+' sign
 * - Country code (1-3 digits)
 * - National number (up to 15 digits total)
 * - No spaces, dashes, or other separators
 *
 * Example: +14155552671
 */
function phoneSchema() {
  return joi.string()
    .trim()
    .pattern(/^\+[1-9]\d{1,14}$/); // E.164 format regex
}

/**
 * The date model schema for 'YYYY-MM-DD' format
 *
 * Example: '2021-01-01'
 */
function dateSchema() {
  return joi.string().regex(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * Email schema — trims whitespace and lowercases before validation.
 *
 * Example: 'user@example.com'
 */
function emailSchema() {
  return joi.string().trim().lowercase().email();
}

/**
 * UUID v4 schema.
 *
 * Example: '550e8400-e29b-41d4-a716-446655440000'
 */
function uuidSchema() {
  return joi.string().uuid({ version: 'uuidv4' });
}

/**
 * Password schema — enforces a minimum length of 8 characters.
 * Callers can chain additional rules (e.g. .max(128)) at the point of use.
 */
function passwordSchema() {
  return joi.string().min(8);
}

/**
 * Pagination schema for list/query actions.
 *
 * pagination = {
 *   page: 1,     // 1-based page number
 *   limit: 20,   // results per page
 * }
 */
function paginationSchema() {
  return joi.object().keys({
    page: joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).max(100).default(20),
  }); // dont put required() or optional() because it will be handled by the parent schema
}

/**
 * Number comparison schema for query filters.
 * Accepts either:
 * - An integer (exact match): 1706234567890
 * - An object with comparison operators: { gte: 1706234567890, lte: 1706334567890 }
 *
 * Valid keys: gte, gt, lt, lte (all optional, values must be integers)
 *
 * Example usage:
 *   startTime: numberComparisonSchema().optional()
 *   endTime: numberComparisonSchema().optional()
 */
function numberComparisonSchema() {
  return joi.alternatives().try(
    joi.number().integer(), // exact match
    joi.object().keys({
      gte: joi.number().integer().optional(),
      gt: joi.number().integer().optional(),
      lt: joi.number().integer().optional(),
      lte: joi.number().integer().optional()
    }).min(1) // at least one key required if object
  );
}
