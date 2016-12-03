var db = require('../models'),
  config = require('../config/config'),
  Sequelize = require('sequelize'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  error = require('../utils/error'),
  GeoJSON = require('geojson'),
  Chance = require('chance'),
  mailer = require('../services/mailer'),
  clientService = require('../services/clients');

var updatableAttributes = ['farmName', 'shortDescription', 'fullDescription', 'note', 'webSite', 'travelDetails',
  'noPhone', 'noEmail', 'isHidden', 'activities', 'openingMonths', 'stays', 'lodgings', 'capacity', 'childrenOk',
  'petsOk'];

/**
 * Returns a paginated list of clients.
 */
exports.index = function(req, res, next) {

  // Validate parameters
  req.query.limit = parseInt(req.query.limit) || 10;
  req.query.offset = parseInt(req.query.offset) || 0;
  req.checkQuery('limit', 'Limit must be an integer >= 1 and <= 20.').isInt().gte(1).lte(20);
  req.checkQuery('offset', 'Offset must be an integer >= 0').isInt().gte(0);

  var errors = req.validationErrors();
  if (errors) {
    throw new error.BadRequestError(errors);
  }

  // Find the clients
  var promise = clientService.findclient(req.user, req.query);

  // Handle success
  promise = promise.then(function(clients) {

    // Send data
    res.send({
      clients: clients.rows,
      meta: {
        offset: req.query.offset,
        limit: req.query.limit,
        total: clients.count
      }
    });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};


/**
 * Returns a single client.
 */
exports.single = function(req, res, next) {

  const userId = _.get(req, 'user.id');
  const userclientId = _.get(req, 'user.client.id');
  const role = req.getUserRole(userclientId);

  var clientWhere = { id: req.params.id };
  var userWhere = null;

  var isRestricted = ['admin', 'owner'].indexOf(role) < 0;

  // Exclude pending, hidden and suspended client if user is not admin nor owner
  if (isRestricted) {
    clienttWhere.isPending = false;
    clientWhere.isApproved = true;
    clientWhere.isHidden = false;
    userWhere = { isSuspended: false };
  }

  // Only return approved reviews or reviews posted by the artist if not admin
  if (role !== 'admin') {
    var isApproved = { approvedAt: { $ne: null } };
    var isAuthor = { authorId: { $eq: userId } };

    if (userId) {
      reviewWhere = {
        $or: [isApproved, isAuthor]
      };
    } else {
      reviewWhere = isApproved;
    }
  }

  // Find the client
  var promise = db.client.findOne({
    where: clientWhere,
    role: role,
    include: [
      {
        model: db.user,
        where: userWhere
      },

      {
        model: db.photo,
        required: false,
        as: 'photos'
      }
    ]
  });

  // Return the client
  promise = promise.then(function(client) {
    if (!client) {
      throw new error.NotFoundError();
    }
    res.send({
      client: client,
      photos: client.photos
    });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Updates a client.
 */
exports.update = function(req, res, next) {

  // Validate input
  if (!req.body.client) {
    return next(new error.BadRequestError('No client object present in body.'));
  }

  // Only admins can update a client that does not belong to the current user
  var userIdFilter = req.user.isAdmin ? null : { userId: req.user.id };

  // Find the original client
  var promise = db.client.find({
    where: Sequelize.and(
      { id: req.params.id },
      userIdFilter
    )
  });

  // Update the client
  promise = promise.then(function(client) {
    if (!client) {
      throw new error.NotFoundError();
    }

    var attributes = updatableAttributes;
    if (client.addressId) {
      if (client.addressId !== parseInt(req.body.client.addressId)) {
        throw new error.BadRequestError('addressId cannot be updated.');
      }
    } else {
      attributes = attributes.concat(['addressId']);
    }

    // Ensure website is null and not an empty string (validation fails otherwise)
    req.body.client.webSite = req.body.client.webSite || null;

    // Update the client
    return client.update(req.body.client, { fields: attributes });
  });

  // The updateAttributes method returns object containing all passed attributes: we must reload
  // See: https://github.com/sequelize/sequelize/issues/1320
  promise = promise.then(function(client) {
    return client.reload();
  });

  // Return the client
  promise = promise.then(function(client) {
    res.send({ client: client });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Creates a client.
 */
exports.create = function(req, res, next) {

  // Validate input
  if (!req.body.client) {
    return next(new error.BadRequestError('No client object present in body.'));
  }
  req.body.client.userId = parseInt(req.body.client.userId);
  if (req.body.client.userId !== req.user.id) {
    res.sendStatus(400);
    return;
  }



  // Create the client
  promise = promise.then(function(client) {

    // Existing client found for this user
    if (client) {
      throw new error.ConflictError('User already has a client.');
    }

    // Set the user id + default values
    req.body.client.userId = req.user.id;

    // Ensure website is null and not an empty string (validation fails otherwise)
    req.body.client.webSite = req.body.client.webSite || null;



    // Create the client
    return db.client.create(req.body.client, { fields: attributes });
  });

  // Return created client
  promise = promise.then(function(client) {
    res.send({ client: client });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

