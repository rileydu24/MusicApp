var aws = require('aws-sdk'),
  fs = require('fs'),
  config = require('../config/config'),
  Promise = require('bluebird');

// Set AWS config
aws.config.update(config.aws);

// Create S3 client
var s3 = new aws.S3({ params: { Bucket: config.aws.bucket } });

/**
 * AWS client.
 */
module.exports = {
  /**
   * Uploads a file to our S3 bucket.
   * @param {String} filePath The path of the file.
   * @param {String} key The key within the bucket.
   * @param {String} [contentType=application/octet-stream] The content type of the file.
   * @returns {Promise}
   */
  uploadFile: function(filePath, key, contentType) {

    // WTF node path use windows backslash on windows
    key = key.replace(/\\/g, '/');

    return new Promise(function(resolve, reject) {

      // Read file
      fs.readFile(filePath, function(err, data) {

        if (err) {
          reject(err);
        }
        if (config.testing) {
          resolve();
          return;
        }

        // Upload to S3 bucket
        var base64data = new Buffer(data, 'binary');
        s3.upload({
          Body: base64data,
          ACL: 'public-read',
          Key: key,
          ContentType: contentType || 'application/octet-stream'
        }, function(s3Err, info) {
          if (s3Err) {
            reject(s3Err);
          } else {
            resolve(info);
          }
        });
      });
    });
  },
  /**
   * Deletes a file from our S3 bucket.
   * @param {String} key The key within the bucket.
   * @returns {Promise}
   */
  deleteFile: function(key) {

    // WTF node path use windows backslash on windows
    key = key.replace(/\\/g, '/');

    return new Promise(function(resolve, reject) {

      if (config.testing) {
        resolve();
        return;
      }

      // Delete object
      s3.deleteObject({ Key: key }, function(s3Err, data) {
        if (s3Err) {
          reject(s3Err);
        } else {
          resolve(data);
        }
      });
    });
  }
};
