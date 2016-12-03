// Start New Relic monitoring
require('newrelic');

var logger = require('./utils/logger');
var db = require('./models');



logger.debug('Authenticating against the database...');

db.sequelize.sync();/*authenticate().then(function() {
  logger.debug('Authentication succeeded. Starting the server...');
  var app = require('./app')();

  // Start listening
  app.listen(app.get('port'), function() {
    logger.debug(`Express server listening on port ${app.get('port')}`);
  });
});*/
