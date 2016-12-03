/**
 *  Configures a connection to the database and to collects all model definitions.
 */
var fs = require('fs'),
  path = require('path'),
  config = require('../config/config'),
  logger = require('../utils/logger'),
  Sequelize = require('sequelize'),
  sequelizeAttributeRoles = require('sequelize-attribute-roles'),
  _ = require('lodash');

var sequelize = new Sequelize(config.mysql.database, config.mysql.user, config.mysql.password, {
    client: config.mysql.client,
    port: config.mysql.port,
    logging: logger.debug
  }),
  db = {};

// Load role-based restrictions on attributes
sequelizeAttributeRoles(sequelize);

// Load all models
fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file !== 'index.js');
  })
  .forEach(function(file) {
    var model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

// Load all associations
Object.keys(db).forEach(function(modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

module.exports = _.extend({
  sequelize: sequelize,
  Sequelize: Sequelize
}, db);
