/**
 * Sequelize model for Users.
 * @param sequelize The Sequelize instance.
 * @param DataTypes The data types.
 * @returns {Object} The Sequelize model.
 */
var _ = require('lodash');
var moment = require('moment');

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('user', {
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      isEmail: true,
      access: {
        other: false,
        member: false
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [1, 255] },
      access: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [1, 255] },
      access: {
        other: false
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [1, 255] },
      access: {
        other: false
      }
    },
    birthDate: {
      type: DataTypes.STRING,
      allowNull: true,
      get: function() {
        // Formats the date
        var date = this.getDataValue('birthDate');
        if (date) {
          return moment(date).utc().format('YYYY-MM-DD');
        }
      },
      access: {
        other: false
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { len: [0, 255] },
      access: {
        other: false
      }
    },
    photo: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { len: [0, 255] },
      access: {
        other: false
      }

    }


  }, {
    tableName: 'users',
    classMethods: {
      associate: function(models) {
        User.hasOne(models.client, { as: 'client', onDelete: 'cascade' });
        User.hasOne(models.artist, { onDelete: 'cascade' });
        User.hasOne(models.salt, { onDelete: 'cascade' });
        User.belongsToMany(models.client);
      }

    }
  });
  return User;
};
