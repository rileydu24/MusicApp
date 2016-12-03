
var path = require('path');

module.exports = function(sequelize, DataTypes) {
  var Photo = sequelize.define('photo', {
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [1, 255] }
    },
    caption: {
      type: DataTypes.STRING,
      validate: { len: [0, 255] }
    }
  }, {
    tableName: 'photos',
    classMethods: {
      associate: function(models) {
        Photo.belongsTo(models.client, {
          onDelete: 'cascade',
          foreignKey: { allowNull: false }
        });
      },
      getS3Key: function(fileName) {
        return path.join('photos/clients', fileName);
      }
    }
  });
  return Photo;
};
