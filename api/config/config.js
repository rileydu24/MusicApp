var path = require('path');

// Loads the appropriate configuration based on the current Node environment.
var filename = (process.env.NODE_ENV || 'development') + '.json';
var configPath = path.join(__dirname, filename);

console.log('LOADING: ' + configPath);

var config = require(configPath);

module.exports = config;
