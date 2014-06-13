var debug = require('debug')('sear:json');

exports.json = function (base, filepath, data, callback) {
  debug('Processing JSON %s %s', base, filepath);
  data = "module.exports = " + data.toString() + ";\n";

  callback(null, data);
};
