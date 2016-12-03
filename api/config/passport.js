var LocalStrategy = require('passport-local').Strategy,
  db = require('../../server/models'),
  logger = require('../utils/logger'),
  userService = require('../services/users');

/**
 * Initializes and configures passport authentication.
 * @param app The express application.
 * @param passport The passport middleware.
 */
module.exports = function(app, passport) {

  // Init passport
  app.use(passport.initialize());

  // Enable session middleware
  app.use(passport.session());

  // Configure authentication
  passport.use(new LocalStrategy(function(username, password, done) {

    logger.info('Authenticating user \'' + username + '\'');

    var promise = db.user.find({
      where: { email: username },
      include: [db.salt]
    });

    promise = promise.then(function(user) {
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      // Make sure the user was not suspended
      if (user.isSuspended) {
        return done(null, false, { message: 'User is suspended.' });
      }

      // Validate the password
      var saltStr = user.salt ? user.salt.salt : null;
      var isValid = userService.validatePassword(user.passwordHash, password, saltStr);

      // Failure: return 401
      if (!isValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      // Success: return user
      return done(null, user);
    });

    promise.catch(function(err) {
      done(err);
    });
  }));

  // Indicates what must be serialized in session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // Finds the authenticated user object from the id stored in session
  passport.deserializeUser(function(id, done) {
    db.user.findOne({
      where: { id: id },
      include: [
        { model: db.host, as: 'host', attributes: ['id'] },
        { model: db.wwoofer, attributes: ['id'] },
        { model: db.membership, attributes: ['id', 'type', 'expireAt'] },
        { model: db.review, attributes: ['id'] }
      ]
    }).then(function(user) {
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
      return null;
    }).catch(function(error) {
      done(error, null);
    });
  });
};
