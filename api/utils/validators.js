/**
 * Custom validators for express-validator.
 */
var validators = {
  customValidators: {
    gte: function(param, num) {
      return param >= num;
    },
    lte: function(param, num) {
      return param <= num;
    }
  }
};

module.exports = validators;
