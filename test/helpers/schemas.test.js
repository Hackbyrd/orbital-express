/**
 * Test helpers/schemas
 */

'use strict';

// third-party
const joi = require('joi');

// helpers
const schemas = require('../../helpers/schemas');

function joiErrorToString(error) {
  return error.details.map(detail => detail.message).join(', ');
}

describe('helpers/schemas.js', () => {
  // addressSchema
  describe('addressSchema', () => {
    it('should validate address with all fields filled out against addressSchema with no errors.', () => {
      const address = {
        address1: '14000 Saddle River Drive',
        address2: 'APT EE100',
        city: 'North Potomac',
        state: 'MD',
        postalCode: '20878',
        countryCode: 'US',
      };

      const { error, value } = schemas.addressSchema().validate(address);
      expect(error).toBe(undefined);
    });

    it('should validate address with all fields expect address2 filled out against addressSchema with no errors.', () => {
      const address = {
        address1: '14000 Saddle River Drive',
        city: 'North Potomac',
        state: 'MD',
        postalCode: '20878',
        countryCode: 'US',
      };

      const { error, value } = schemas.addressSchema().validate(address);
      expect(error).toBe(undefined);
    });

    it('should validate address against addressSchema unsuccessfully because address1 is greater than 128 characters.', () => {
      const address = {
        address1: '1234567890123456789012345678900123456789001234567890012345678900123456789001234567890012345678900123456789001234567890012345678900123456789',
        city: 'North Potomac',
        state: 'MD',
        postalCode: '20878',
        countryCode: 'US',
      };

      const { error, value } = schemas.addressSchema().validate(address);
      expect(joiErrorToString(error)).toBe('"address1" length must be less than or equal to 128 characters long');
    });

    it('should validate address against addressSchema unsuccessfully because all fields are missing.', () => {
      const address = {
        address2: '',
      };

      // turn off abortEarly
      const { error, value } = schemas.addressSchema().validate(address, { abortEarly: false });
      expect(joiErrorToString(error)).toBe(
        '"address1" is required, "city" is required, "state" is required, "postalCode" is required, "countryCode" is required'
      );
    });
  }); // END addressSchema

  // geocodeSchema
  describe('geocodeSchema', () => {
    it('should validate geocode with all fields filled out against geocodeSchema with no errors.', () => {
      const geocode = {
        lat: 37.98765432,
        lng: -122.98765432,
        alt: 200,
      };

      const { error, value } = schemas.geocodeSchema().validate(geocode);
      expect(error).toBe(undefined);
    });

    it('should validate geocode with all fields filled out against geocodeSchema with no errors.', () => {
      const geocode = {
        lat: 37.98765432,
        alt: 200,
      };

      // turn off abortEarly
      const { error, value } = schemas.geocodeSchema().validate(geocode, { abortEarly: false });
      expect(joiErrorToString(error)).toBe('"lng" is required');
    });
  }); // END geocodeSchema
}); // END helpers/schemas
