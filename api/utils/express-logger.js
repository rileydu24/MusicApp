var newrelic = require('newrelic'),
  logger = require('./logger');

/**
 * Express middleware in charge of logging errors (console, file, newrelic, ...)
 * before passing them to the global error handling middleware.
 */
module.exports = function() {

  return function(err, req, res, next) {

    // Fix status of the error if needed
    if (err.name === 'SequelizeValidationError') {
      err.status = 422;
    }

    // Prepare additional data
    var meta = { error: err, stack: err.stack };
    if (req.user) {
      meta.userId = req.user.id;
      meta.email = req.user.email;
    }

    // Log the error
    logger.error('Request cannot complete', meta, function() {

      // Wait until the logger is done writing on file (winston bug, production only)
      var timeout = process.env.NODE_ENV === 'production' ? 1500 : 0;
      setTimeout(function() {

        // Log error in new relic (production only)
        newrelic.noticeError(err);

        // Force new relic agent to send logs over, then pass the error to express-error-handler
        if (newrelic.agent) {
          try {
            newrelic.agent.harvest(function() {
              next(err);
            });
          } catch (err2) {
            next(err);
          }
        } else {
          next(err);
        }
      }, timeout);
    });
  };
};
