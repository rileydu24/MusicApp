var db = require('../models'),
  _ = require('lodash'),
  userService = require('../services/users'),
  error = require('../utils/error'),
  mailer = require('../services/mailer');

/**
 * Searches and returns a list of users.
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

  // Prepare user filters
  var userFilters = [];
  var userWhere = {
    $and: userFilters
  };

  // Prepare isSuspended filter
  userFilters.push({ isSuspended: req.query.isSuspended === 'true' });

  // Prepare search term filter
  if (req.query.searchTerm) {
    var searchTerm = '%' + req.query.searchTerm.trim() + '%';
    var searchTermFilters = [
      ['REPLACE(CONCAT(user.firstName, user.lastName), " ", "") like ?', searchTerm.replace(/\s/g, '')],
      { email: { $like: searchTerm } }
    ];
    userFilters.push({ $or: searchTermFilters });
  }

  // Prepare email address filter
  if (req.query.email) {
    userFilters.push({ email: req.query.email });
  }

  // Find all users matching parameters
  var promise = db.user.findAndCountAll({
    limit: req.query.limit,
    offset: req.query.offset,
    where: userWhere,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: ['passwordHash'] },
    include: [
      { model: db.artist, attributes: ['id'] },
      { model: db.client, as: 'client', attributes: ['id'] }
    ]
  });

  // Return the users
  promise = promise.then(function(users) {
    res.send({
      users: users.rows,
      meta: {
        offset: req.query.offset,
        limit: req.query.limit,
        total: users.count
      }
    });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Searches and returns a single user.
 */
exports.single = function(req, res, next) {

  var userId = _.get(req, 'user.id');
  var role = req.getUserRole(userId);

  // Find the user
  var promise = db.user.findOne({
    where: { id: req.params.id },
    role: role,
    include: [
      { model: db.client, as: 'client', attributes: ['id'] },
      { model: db.artist, attributes: ['id'] },
      { model: db.client, as: 'favorites', attributes: ['id'] }
    ]
  });

  // Return the user
  promise = promise.then(function(user) {
    if (!user) {
      throw new error.NotFoundError();
    }
    res.send({ user: user });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Creates a new user and sends a confirmation email.
 * TODO: add tests
 */
exports.create = function(req, res, next) {

  // Validate input
  if (!req.body.user || !req.body.user.password || req.body.user.password.length < 8) {
    return next(new error.BadRequestError());
  }

  // Make sure email address is not in use
  var promise = db.user.find({
    where: { email: req.body.user.email }
  });

  // Create the user
  var createdUser;
  promise = promise.then(function(user) {

    // Test whether the email address is already in use
    if (user) {
      throw new error.ConflictError('Email address already in use.');
    }

    // Generate a salt and key
    var saltAndKey = userService.generateSaltAndKey(req.body.user.password);

    // Set the password
    req.body.user.passwordHash = saltAndKey.key;

    // Set default values
    req.body.user.isAdmin = false;
    req.body.user.isSuspended = false;
    req.body.user.locale = req.getLocale();

    // List attributes that can be set upon creation
    var attributes = ['email', 'firstName', 'lastName', 'birthDate', 'phone', 'locale', 'passwordHash', 'isAdmin', 'isSuspended'];

    // Create the user and salt
    return db.sequelize.transaction(function(t) {
      return db.user.create(req.body.user, {
        fields: attributes,
        transaction: t
      }).then(function(newUser) {
        createdUser = newUser;
        return db.salt.create({
          salt: saltAndKey.salt,
          userId: newUser.id
        }, { transaction: t });
      });
    });
  });

  // Send confirmation email
  promise = promise.then(function() {
    return mailer.register(createdUser);
  });

  // Return created user
  promise = promise.then(function() {
    res.send({ user: createdUser });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Updates a user.
 */
exports.update = function(req, res, next) {

  // Validate input
  if (!req.body.user) {
    return next(new error.BadRequestError());
  }

  // Make sure an email was provided
  req.checkBody('user.email', 'Invalid or missing email').notEmpty().isEmail();
  var errors = req.validationErrors();
  if (errors) {
    return next(new error.BadRequestError(errors[0].msg));
  }

  // Only admins can update other users than themselves
  var userId = req.user.isAdmin ? req.params.id : req.user.id;

  // Search for users with same email address and different id than the current user
  var promise = db.user.count({
    where: {
      email: req.body.user.email,
      id: { ne: userId }
    }
  });

  // Find the user
  promise = promise.then(function(count) {

    // Test whether the email address is already in use
    if (count > 0) {
      throw new error.ConflictError('Email address already in use.');
    }

    // Find the original user
    return db.user.findById(userId);
  });

  // Update the user
  promise = promise.then(function(user) {
    if (!user) {
      throw new error.NotFoundError();
    }

    // List the attributes that can be updated
    var attributes = ['email', 'phone', 'locale'];
    if (req.user.isAdmin) {
      attributes.push('firstName', 'lastName', 'birthDate', 'isSuspended');
    } else if (!user.birthDate) {
      // Legacy users do not have a birth date, allow them to set it
      attributes.push('birthDate');
    }

    // Update the user
    return user.updateAttributes(req.body.user, attributes);
  });

  // Return the user
  promise = promise.then(function(user) {
    res.send({ user: user });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Resets a user password then sends the new password by email.
 */
exports.resetPassword = function(req, res, next) {

  // Make sure an email was provided
  req.checkBody('email', 'Invalid or missing email').notEmpty().isEmail();
  var errors = req.validationErrors();
  if (errors) {
    return next(new error.BadRequestError(errors[0].msg));
  }

  var user;

  // Find the user by email address
  var promise = db.user.find({
    where: {
      email: req.body.email
    }
  });

  // Generate new password
  var newPassword = Math.random().toString(36).substr(2, 10);

  // Change the user password
  promise = promise.then(function(userRecord) {
    if (!userRecord) {
      throw new error.NotFoundError();
    }

    user = userRecord;

    return userService.changePassword(userRecord, newPassword);
  });

  // Send email containing the new password
  promise = promise.then(function() {
    return mailer.resetPassword(user, newPassword);
  });

  // Return 200
  promise = promise.then(function() {
    res.json('OK');
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Changes a user's password.
 */
exports.changePassword = function(req, res, next) {

  // A user can only update its own password
  if (req.params.id !== req.user.id) {
    return next(new error.UnauthorizedError());
  }

  // Make sure a valid password was provided
  req.checkBody('newPassword', 'New password is invalid.').notEmpty().len(8, 25);
  var errors = req.validationErrors();
  if (errors) {
    return next(new error.BadRequestError(errors[0].msg));
  }

  // Find the user
  var promise = db.user.findById(req.params.id);

  // Update the user's password
  promise = promise.then(function(user) {
    if (!user) {
      throw new error.NotFoundError();
    }

    // Get new password
    var newPassword = req.body.newPassword;

    return userService.changePassword(user, newPassword);
  });

  // Return 200
  promise = promise.then(function() {
    res.json('OK');
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Impersonates a user by email address (admins only).
 */
exports.impersonate = function(req, res, next) {

  // Make sure an email was provided
  req.checkBody('email', 'Invalid or missing email').notEmpty().isEmail();
  var errors = req.validationErrors();
  if (errors) {
    return next(new error.BadRequestError(errors[0].msg));
  }

  // Find the user by email
  var promise = db.user.find({
    where: {
      email: req.body.email
    }
  });

  // Impersonate user
  promise = promise.then(function(user) {
    if (!user) {
      throw new error.NotFoundError();
    }

    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      res.send({ user: user });
    });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};
