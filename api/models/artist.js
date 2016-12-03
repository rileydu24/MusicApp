
var moment = require('moment');

module.exports = function(sequelize, DataTypes) {
  var Artist = sequelize.define('artist', {
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { len: [0, 255] },
      access: {
        other: false
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { len: [0, 255] },
      access: {
        other: false
      }
    },
    birthDate: {
      type: DataTypes.STRING,
      get: function() {
        // Formats the date
        var date = this.getDataValue('birthDate2');
        if (date) {
          return moment(date).utc().format('YYYY-MM-DD')
        }
      },
      Type: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {len: [0, 255]},
        access: {
          other: false
        }

      }

  }}, {
    tableName: 'artists',
    classMethods: {
      associate: function(models) {
        Artist.belongsTo(models.user);
      }
    },
    instanceMethods: {

      toJSON: function() {
        var json = this.get();

        // Remove the user and the address from the payload
        json.user = undefined;

        return json;
      }
    }
  });
  return Artist;
};
