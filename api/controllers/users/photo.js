var db = require('../../models'),
  easyimg = require('easyimage'),
  fs = require('fs'),
  awsClient = require('../../services/aws-client'),
  error = require('../../utils/error'),
  path = require('path');

var allowedMimeTypes = ['image/gif', 'image/jpeg', 'image/jpeg', 'image/tiff', 'image/png'];

/**
 * Return the photo for the current user.
 */
exports.index = function(req, res, next) {

  // Get the user
  var promise = db.user.findById(req.params.id);

  // Return the photo
  promise = promise.then(function(user) {
    res.send({ photo: user.photo });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Uploads photo in the photo folder and link it into the user.
 */
exports.create = function(req, res, next) {

  // Data validation
  if (!req.file) {
    return next(new error.BadRequestError());
  }

  // Get file info
  var file = req.file;

  // Check format
  if (allowedMimeTypes.indexOf(file.mimetype) === -1) {
    return next(new error.UnsupportedMediaTypeError());
  }

  // Check size
  if (file.size > 5000000) { // 5mb
    return next(new error.FileTooBigError());
  }

  // Only admins can upload a photo for a user that is not the current user
  if (req.user.isAdmin === false && req.params.id !== req.user.id) {
    return next(new error.UnauthorizedError());
  }

  // Find the user
  var promise = db.user.findById(req.params.id);

  var photoUser = null;

  // Delete the photo in S3
  promise = promise.then(function(user) {

    if (!user) {
      throw new error.NotFoundError();
    }

    // Save the user
    photoUser = user;

    if (photoUser.photo) {
      var key = path.join('photos/users', photoUser.photo);
      return awsClient.deleteFile(key);
    }
  });

  // Remove the photo in the database
  promise = promise.then(function() {
    return photoUser.updateAttributes({ photo: null }, ['photo']);
  });

  // Build file name with extension
  var extension = file.mimetype.split('/')[1];
  filenameWithExtension = `${file.filename}.${extension}`;

  // Resize image
  var resizedFilePath = path.join(file.destination, 'resized', filenameWithExtension);
  promise = promise.then(function() {

    // Resize image
    return easyimg.resize({
      src: file.path,
      dst: resizedFilePath,
      width: 300
    });
  });

  // Upload to S3
  promise = promise.then(function(photo) {

    // Remove original file (ignore errors)
    fs.unlink(file.path, function() {
    });

    // Upload file
    var key = path.join('photos/users', photo.name);
    return awsClient.uploadFile(photo.path, key, file.mimetype);
  });

  // Update user data
  promise = promise.then(function() {

    // Remove resized file (ignore errors)
    fs.unlink(resizedFilePath, function() {
    });

    // Save the photo in the user
    photoUser.updateAttributes({ photo: filenameWithExtension }, ['photo']);
  });

  // Return the photo
  promise = promise.then(function() {
    res.send({ photo: filenameWithExtension });
  });

  // Handle errors
  promise.catch(function(err) {

    // Remove tmp files (ignore errors)
    fs.unlink(file.path, function() {
    });
    fs.unlink(resizedFilePath, function() {
    });

    next(err);
  });
};

/**
 * Deletes the user photo.
 */
exports.delete = function(req, res, next) {

  // Only admins can delete a photo for a user that is not the current user
  if (req.user.isAdmin === false && req.params.id !== req.user.id) {
    return next(new error.UnauthorizedError());
  }

  // Find the user
  var promise = db.user.findById(req.params.id);

  // Delete the photo in S3
  var photoUser;
  promise = promise.then(function(result) {
    if (!result) {
      throw new error.NotFoundError();
    }

    photoUser = result;
    var key = path.join('photos/users', photoUser.photo);
    return awsClient.deleteFile(key);
  });

  // Remove the photo in the database
  promise = promise.then(function() {
    return photoUser.updateAttributes({ photo: null }, ['photo']);
  });

  // Return 204
  promise = promise.then(function() {
    res.sendStatus(204);
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};
