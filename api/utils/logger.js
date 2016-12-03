var config = require('../config/config');
var winston = require('winston');
winston.emitErrs = true;

// Setup transports
var transports = [
  new winston.transports.Console({
    level: config.loggingLevel.console,
    handleExceptions: true,
    humanReadableUnhandledException: true,
    json: false,
    colorize: true
  }),
  new winston.transports.File({
    name: 'debug-file',
    level: config.loggingLevel.file,
    filename: './logs/wwoof-debug.log',
    json: true,
    maxsize: 52428800, // 50MB
    colorize: false
  }),
  new winston.transports.File({
    name: 'error-file',
    level: 'error',
    filename: './logs/wwoof-error.log',
    handleExceptions: true,
    humanReadableUnhandledException: true,
    json: true,
    maxsize: 5242880, // 5MB
    colorize: false
  })
];

// Create logger
var logger = new winston.Logger({
  transports,
  exitOnError: false
});

module.exports = logger;
module.exports.stream = {
  write: function(message) {
    logger.info(message);
  }
};
