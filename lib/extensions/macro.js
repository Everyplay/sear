var debug = require('debug')('sear:macro');

exports.macro = function (filepath, data, callback) {
  var self = this;

  debug('Processing MACRO %s %s', filepath);

  var module;

  try {
    module = require(filepath);
  } catch (e) {
    return callback(e);
  }

  module.call(self, filepath, callback);
};
