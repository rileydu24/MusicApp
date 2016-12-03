var db = require('../models'),
  moment = require('moment'),
  _ = require('lodash');

/**
 * Finds hosts.
 * @param user The user requesting the hosts.
 * @param filters The filters.
 * @param attributes The host attributes to fetch.
 * @returns {Promise}
 */
exports.findHosts = function(user, filters, attributes) {

  // Enforce default values for non-admin users
  var isAdmin = user && user.isAdmin;
  if (isAdmin) {
    filters.approvalStatus = filters.approvalStatus || 'approved';
    filters.membershipStatus = filters.membershipStatus || 'valid';
    filters.isSuspended = filters.isSuspended === 'true';
    filters.isHidden = filters.isHidden === 'true';
  } else {
    filters.approvalStatus = 'approved';
    filters.membershipStatus = 'valid';
    filters.isSuspended = false;
    filters.isHidden = false;
  }

  // Prepare the department condition
  var departmentWhere = filters.dptId ? { id: filters.dptId } : null;

  // Prepare filters
  var hostFilters = [];
  var activityFilters = [];
  var lodgingFilters = [];
  var monthFilters = [];
  var searchTermFilters = [];

  // Prepare user condition
  var userWhere = {
    isSuspended: filters.isSuspended
  };

  // Prepare host conditions
  var hostWhere = {
    $and: hostFilters
  };

  // Prepare host where condition
  hostWhere.isHidden = filters.isHidden;
  hostWhere.isPending = filters.approvalStatus === 'pending';
  hostWhere.isApproved = filters.approvalStatus === 'approved';

  // Prepare capacity filter
  var capacityInt = parseInt(filters.capacity);
  if (!isNaN(capacityInt)) {
    hostWhere.capacity = { gte: capacityInt };
  }

  // Prepare the stay filter
  if (filters.stay) {
    hostWhere.stays = { like: '%' + filters.stay + '%' };
  }

  // Prepare the children/pets OK filters
  if (filters.childrenOk === 'true') {
    hostWhere.childrenOk = true;
  }
  if (filters.petsOk === 'true') {
    hostWhere.petsOk = true;
  }

  // Prepare the activity filter
  if (_.isArray(filters.activities) && !_.isEmpty(filters.activities)) {
    activityFilters = filters.activities.map(function(activity) {
      return { activities: { like: `%${activity}%` } };
    });
    hostFilters.push({ $and: activityFilters });
  }

  // Prepare the lodging filter
  if (_.isArray(filters.lodgings) && !_.isEmpty(filters.lodgings)) {
    lodgingFilters = filters.lodgings.map(function(lodging) {
      return { lodgings: { like: `%${lodging}%` } };
    });
    hostFilters.push({ $or: lodgingFilters });
  }

  // Prepare the month filter
  if (_.isArray(filters.months) && !_.isEmpty(filters.months)) {
    monthFilters = filters.months.map(function(month) {
      return { openingMonths: { like: `%${month}%` } };
    });
    hostFilters.push({ $or: monthFilters });
  }

  // Exclude hosts without valid membership
  // Note: this part of the query could not be generated properly via the ORM (way too cray cray!)
  var filter = '> ?';
  if (filters.membershipStatus === 'expired') {
    filter = '< ?';
  } else if (filters.membershipStatus === 'none') {
    filter = 'IS NULL';
  }
  var rawQuery = '(SELECT `expireAt` FROM `memberships` ' +
    'WHERE `host`.`userId` = `memberships`.`userId` ' +
    'AND `memberships`.`type` = \'H\' ' +
    'ORDER BY `memberships`.`expireAt` DESC LIMIT 1) ' + filter;
  hostFilters.push([rawQuery, moment().toISOString()]);

  // Prepare search term condition
  var searchTerm = _.trim(filters.searchTerm);
  if (searchTerm) {
    searchTerm = '%' + searchTerm + '%';
    searchTermFilters.push(['CONCAT(user.firstName, \' \', user.lastName) like ?', searchTerm]);
    searchTermFilters.push({ farmName: { $like: searchTerm } });
    searchTermFilters.push({ fullDescription: { $like: searchTerm } });
    searchTermFilters.push(['address.city like ?', searchTerm]);
    hostFilters.push({ $or: searchTermFilters });
  }

  // Find all hosts matching parameters
  return db.host.findAndCountAll({
    limit: filters.limit,
    offset: filters.offset,
    where: hostWhere,
    attributes: attributes,
    include: [
      {
        model: db.user,
        required: true,
        where: userWhere,
        attributes: ['id']
      },
      {
        model: db.address,
        required: true,
        attributes: ['id', 'departmentId', 'latitude', 'longitude'],
        include: [
          {
            model: db.department,
            required: true,
            where: departmentWhere,
            attributes: ['id']
          }
        ]
      },
      {
        model: db.photo,
        as: 'photos',
        attributes: ['id', 'fileName']
      }
    ]
  });
};
