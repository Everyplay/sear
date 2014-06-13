var argv = require('optimist').argv;
var _ = require('lodash');

module.exports.readOptions = function (map) {
  var result = {};
  map = map || {};

  result.remain = argv._;

  _.map(argv, function (value, key) {
    if (key !== '_' && key !== '$0') {
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }
      if (key === 'includes') {
        value = value.split(',');
      }
      result[map[key] ? map[key] : key] = value;
    }
  });

  return result;
};
