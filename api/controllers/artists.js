var db = require('../models'),
  config = require('../config/config'),
  Sequelize = require('sequelize'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  mailer = require('../services/mailer'),
  moment = require('moment'),
  error = require('../utils/error');


/**
 * Searches and returns a list of artists.
 */
exports.index = function(req, res, next) {

  // Validate parameters
  req.query.limit = parseInt(req.query.limit) || 20;
  req.query.offset = parseInt(req.query.offset) || 0;
  req.checkQuery('limit', 'Limit must be an integer >= 1 and <= 20.').isInt().gte(1).lte(20);
  req.checkQuery('offset', 'Offset must be an integer >= 0').isInt().gte(0);

  var errors = req.validationErrors();
  if (errors) {
    throw new error.BadRequestError(errors);
  }


  // Prepare search term condition
  var userWhere = null;
  if (req.query.searchTerm) {
    var searchTerm = '%' + req.query.searchTerm.trim() + '%';
    userWhere = {
      $or: [
        ['REPLACE(CONCAT(user.firstName, user.lastName), " ", "") like ?', searchTerm.replace(/\s/g, '')],
        ['REPLACE(CONCAT(firstName2, lastName2), " ", "") like ?', searchTerm.replace(/\s/g, '')],
        { email: { $like: searchTerm } }
      ]
    };
  }


  // Return the artists
  promise = promise.then(function(artists) {
    res.send({
      artists: artists.rows,
      meta: {
        offset: req.query.offset,
        limit: req.query.limit,
        total: artists.count
      }
    });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Searches and returns a single artist.
 */
exports.single = function(req, res, next) {

  var userartistId = _.get(req, 'user.artist.id');
  var role = req.getUserRole(userArtistId);

  // Find the artist
  var promise = db.artist.findOne({
    where: { id: req.params.id },
    role: role,

  });

  // Return the artist
  promise = promise.then(function(artist) {
    if (!artist) {
      throw new error.NotFoundError();
    }
    res.send({
      artist: artist,
    });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};



/**
 * Creates an artist.
 */
exports.create = function(req, res, next) {

  // Validate input
  if (!req.body.artist) {
    return next(new error.BadRequestError('No artist object present in body.'));
  }
  req.body.artist.userId = parseInt(req.body.artist.userId);
  if (req.body.artist.userId !== req.user.id) {
    return next(new error.BadRequestError());
  }

  // Make sure the current user does not have an artist yet
  var promise = db.artist.find({
    where: { userId: req.user.id }
  });

  // Create the artist
  promise = promise.then(function(artist) {

    // Existing artist found for this user
    if (artist) {
      throw new error.ConflictError('User already has an artist.');
    }

    // Create the artist
    var attributes = updatableAttributes.concat(['userId']);
    return db.artist.create(req.body.artist, { fields: attributes });
  });

  // Return the artist
  promise = promise.then(function(artist) {
    res.send({ artist: artist });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

