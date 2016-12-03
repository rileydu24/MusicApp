var db = require('../models'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  NodeGeocoder = require('node-geocoder');

var geocoderOptions = {
  provider: 'google',
  httpAdapter: 'https'
};

var geocoder = NodeGeocoder(geocoderOptions);

/**
 * Returns all addresses associated to host/wwoofer profiles owned by the current user.
 */
exports.getAddressesByUserId = function(userId) {
  var addresses = [];

  // Lookup potential address attached to the user's host profile
  var promise = db.address.find({
    include: {
      model: db.host,
      where: { userId: userId }
    }
  });

  // Lookup potential address attached to the user's wwoofer profile
  promise = promise.then(function(result) {
    if (result) {
      addresses.push(result);
    }
    return db.address.find({
      include: {
        model: db.wwoofer,
        where: { userId: userId }
      }
    });
  });

  // Return found addresses
  promise = promise.then(function(result) {
    if (result) {
      addresses.push(result);
    }
    return addresses;
  });

  return promise;
};

/**
 * Gets the coordinates of an address.
 * @param address The address model.
 * @private
 */
exports.getCoordinates = function(address) {

  // Get the department and country
  var promises = {};
  if (address.departmentId) {
    promises.department = db.department.findById(address.departmentId);
  }
  if (address.countryId) {
    promises.country = db.country.findById(address.countryId);
  }

  return Promise.props(promises).then(function(result) {

    // List overseas territories
    var overseaTerritories = ['971', '972', '973', '974', '976', '987', '988'];

    // Prepare country
    var country;
    if (result.country) {
      country = result.country.name;
    }

    // Overseas territory: replace country name
    if (result.department && _.includes(overseaTerritories, result.department.code)) {
      country = result.department.name;
    }

    // Prepare address
    var fullAddress = [address.address1, address.city].join(', ');

    // Final data object
    var data = {
      address: fullAddress,
      country: country,
      zipcode: address.zipCode
    };

    // Find coordinates
    return geocoder.geocode(data);
  });
};
