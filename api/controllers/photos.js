var db = require('../models'),
  Sequelize = require('sequelize'),
  easyimg = require('easyimage'),
  fs = require('fs'),
  path = require('path'),
  awsClient = require('../services/aws-client'),
  error = require('../utils/error');

var updatableAttributes = ['caption'],
  allowedMimeTypes = ['image/gif', 'image/jpeg', 'image/pjpeg', 'image/tiff', 'image/png'];

/**
 * Searches and returns a single photo.
 */
exports.single = function(req, res, next) {

  // Find the photo
  var promise = db.photo.find({
    where: { id: req.params.id }
  });

  // Return the photo
  promise = promise.then(function(photo) {
    if (!photo) {
      throw new error.NotFoundError();
    }
    res.send({ photo: photo });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Updates a photo.
 */
exports.update = function(req, res, next) {

  // Validate input
  if (!req.body.photo) {
    return next(new error.BadRequestError('This route requires a photo to be provided.'));
  }

  // Update the photo
  promise = promise.then(function(photo) {
    if (!photo) {
      throw new error.NotFoundError();
    }
    return photo.updateAttributes(req.body.photo, updatableAttributes);
  });

  // Return the photo
  promise = promise.then(function(photo) {
    res.send({ photo: photo });
  });

  // Handle errors
  promise.catch(function(err) {
    next(err);
  });
};

/**
 * Uploads photos in the photo folder and create them in the database.
 */
exports.create = function(req, res, next) {



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


  // Resize image
  var resizedFilePath = path.join(file.destination, 'resized', filenameWithExtension);
  promise = promise.then(function(client) {

    if (!client) {
      throw new error.NotFoundError();
    }

    // Resize image
    return easyimg.resize({
      src: file.path,
      dst: resizedFilePath,
      width: 800,
      height: 600
    });
  });

  // Upload to S3
  promise = promise.then(function(photo) {

    // Remove original file (ignore errors)
    fs.unlink(file.path, function() {
    });

    // Upload file
    var key = db.photo.getS3Key(photo.name);
    return awsClient.uploadFile(photo.path, key, file.mimetype);
  });

  promise = promise.then(function() {

    // Remove resized file (ignore errors)
    fs.unlink(resizedFilePath, function() {
    });

    // Create the photo in the database
    return db.photo.create({
      fileName: filenameWithExtension,
    });
  });

  // Return the photo
  promise = promise.then(function(photo) {
    res.send( photo );
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
 * Deletes a photo in the photo folder and delete them in the database.
 */
exports.delete = function(req, res, next) {


  // Find the original photo (including the host to check ownership)
  var promise = db.photo.find({
    where: { id: req.params.id }


});

  // Delete the photo in S3
  var photo;
  promise = promise.then(function(result) {

    if (!result) {
      throw new error.NotFoundError();
    }
    photo = result;

    var key = db.photo.getS3Key(photo.fileName);
    return awsClient.deleteFile(key);
  });

  // Delete the photo in the database
  promise = promise.then(function() {
    return photo.destroy();
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
