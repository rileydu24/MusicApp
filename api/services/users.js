var db = require('../models'),
  crypto = require('crypto');

var iterations = 4096;
var keyLength = 64; // = 512 bits
var saltLength = 32; // = 256 bits

/**
 * Generates a salt and a PBKDF2 key using that salt.
 * @param password The password of the user.
 * @returns {{salt: *, key: *}} The generated salt and the key.
 */
exports.generateSaltAndKey = function(password) {

  // Generate new salt
  var salt = crypto.randomBytes(saltLength).toString('hex');

  // Process the derived key
  var derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256').toString('hex');

  return {
    salt: salt,
    key: derivedKey
  };
};

/**
 * Changes the password of a user in the database.
 * A new salt is generated each time the password is changed.
 * @param user The user.
 * @param newPassword The new password.
 * @returns {Promise}
 */
exports.changePassword = function(user, newPassword) {

  // Generate a salt and key
  var saltAndKey = this.generateSaltAndKey(newPassword);

  // Find the salt for this user
  var promise = db.salt.find({
    where: {
      userId: user.id
    }
  });

  // Generate new password and update user
  promise = promise.then(function(salt) {

    // Update the user hash and salt
    return db.sequelize.transaction(function(t) {
      return user.updateAttributes({
        passwordHash: saltAndKey.key
      }, {
        transaction: t
      }).then(function() {
        // Older users do not have salts
        if (salt) {
          return salt.updateAttributes({ salt: saltAndKey.salt }, { transaction: t });
        } else {
          return db.salt.create({ salt: saltAndKey.salt, userId: user.id }, { transaction: t });
        }
      });
    });
  });

  return promise;
};

/**
 * Validates a password against the user password's hash.
 * If a salt is provided, the password will be tested using PBKDF2.
 * @param userPasswordHash The user password's hash.
 * @param password The value to validate.
 * @param salt The salt.
 * @returns {boolean} True if the provided password is valid, false otherwise.
 */
exports.validatePassword = function(userPasswordHash, password, salt) {

  // Process the hash of the password
  // Older users do not have salts
  var passwordHash;
  if (salt) {
    passwordHash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256').toString('hex');
  } else {
    passwordHash = crypto.createHash('sha1').update(password).digest('hex');
  }

  // Compare the hashes
  return userPasswordHash === passwordHash;
};
