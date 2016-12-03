/**
 * Sequelize model for Salts.
 * @param sequelize The Sequelize instance.
 * @param DataTypes The data types.
 * @returns {Object} The Sequelize model.
 */
module.exports = function(sequelize, DataTypes) {
  var Salt = sequelize.define('salt', {
    salt: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [64, 64] }
    }
  }, {
    tableName: 'salts',
    classMethods: {
      associate: function(models) {
        Salt.belongsTo(models.user);
      }
    }
  });
  return Salt;
};
