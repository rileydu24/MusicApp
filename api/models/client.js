
var _ = require('lodash');

module.exports = function(sequelize, DataTypes) {
  var Client = sequelize.define('client', {


    CompanyName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { len: [5, 50] }
    },

    Description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { len: [300, 5000] }
    },
    webSite: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isUrl: true }

    }

  }, {
    tableName: 'Clients',
    classMethods: {
      associate: function(models) {
        Client.hasMany(models.photo, { onDelete: 'cascade', as: 'photos' });
      }
    }

  });
  return Client;
};
