var debug = require('debug')('sear:json');

exports.json = function (filepath, data, callback) {
  debug('Processing JSON %s', filepath);
  data = "module.exports = " + data.toString() + ";\n";

  callback(null, data);
};
