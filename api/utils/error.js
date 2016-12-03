var util = require('util');

/**
 * Custom error for 400 Bad Request.
 */
var BadRequestError = exports.BadRequestError = function BadRequestError(message) {
  this.name = this.constructor.name;
  this.status = 400;
  this.message = message || 'Bad Request';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

/**
 * Custom error for 401 Unauthorized.
 */
var UnauthorizedError = exports.UnauthorizedError = function UnauthorizedError(message) {
  this.name = this.constructor.name;
  this.status = 401;
  this.message = message || 'Unauthorized';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

/**
 * Custom error for 403 Forbidden.
 */
var ForbiddenError = exports.ForbiddenError = function ForbiddenError(message) {
  this.name = this.constructor.name;
  this.status = 403;
  this.message = message || 'Forbidden';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

/**
 * Custom error for 404 Not found.
 */
var NotFoundError = exports.NotFoundError = function NotFoundError(message) {
  this.name = this.constructor.name;
  this.status = 404;
  this.message = message || 'Not Found';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

/**
 * Custom error for 409 Conflict.
 */
var ConflictError = exports.ConflictError = function ConflictError(message) {
  this.name = this.constructor.name;
  this.status = 409;
  this.message = message || 'Conflict';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

/**
 * Custom error for 413 Entity Too Large.
 */
var FileTooBigError = exports.FileTooBigError = function FileTooBigError(message) {
  this.name = this.constructor.name;
  this.status = 413;
  this.message = message || 'Entity Too Large';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

/**
 * Custom error for 415 Unsupported Media Type.
 */
var UnsupportedMediaTypeError = exports.UnsupportedMediaTypeError = function UnsupportedMediaTypeError(message) {
  this.name = this.constructor.name;
  this.status = 415;
  this.message = message || 'Unsupported Media Type';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

/**
 * Custom error for 500 Server Error.
 */
var ServerError = exports.ServerError = function ServerError(message) {
  this.name = this.constructor.name;
  this.status = 500;
  this.message = message || 'Server Error';
  Error.apply(this, arguments);
  Error.captureStackTrace(this, this.constructor);
};

// Inherit from Error
util.inherits(BadRequestError, Error);
util.inherits(UnauthorizedError, Error);
util.inherits(ForbiddenError, Error);
util.inherits(NotFoundError, Error);
util.inherits(ConflictError, Error);
util.inherits(FileTooBigError, Error);
util.inherits(UnsupportedMediaTypeError, Error);
util.inherits(ServerError, Error);
