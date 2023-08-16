/**
 * All schema helper functions
 *
 * Formats and schemas go here for JOI node module
 */

'use strict';

// third-party modules
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

module.exports = {
  addressSchema,
  geocodeSchema
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
