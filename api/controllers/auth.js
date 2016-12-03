var error = require('../utils/error');

/**
 * Sends the connected user back to the client after authentication.
 */
exports.loginCallback = function(req, res, next) {
  if (req.isAuthenticated()) {
    res.send({ user: req.user });
  } else {
    next(new error.UnauthorizedError());
  }
};

/**
 * Ensures the current request is authenticated before calling the next handler.
 */
exports.ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    next(new error.UnauthorizedError());
  }
};

/**
 * Ensures the current request is authenticated and user is an admin before calling the next handler.
 */
exports.ensureAdmin = function(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin === true) {
    next();
  } else {
    next(new error.UnauthorizedError());
  }
};

/**
 * Indicates whether the current user is authenticated.
 */
exports.isAuthenticated = function (req, res) {
  if (req.isAuthenticated()) {
    res.json(true);
  } else {
    res.sendStatus(401);
  }
};

/**
 * Logs the user out and redirects to home.
 */
exports.logout = function(req, res) {
  req.logout();
  res.json('OK');
};
