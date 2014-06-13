var debug = require('debug')('baker:macro');

exports.macro = function (base, filepath, data, callback) {
  var self = this;

  debug('Processing MACRO %s %s', base, filepath);

  this._resolveFileName(base, filepath, function (err, filename) {
    if (err) {
      callback(err);
      return;
    }

    var module;

    try {
      module = require(filename);
    } catch(e) {
      return callback(e);
    }

    module.call(self, base, filepath, callback);
  });

};

exports.sync_macro = function (base, filepath, data, callback) {
  /* jshint evil: true */
  var runnable = new Function("module", "exports", data.toString());
  var exp = {};
  var mod = {exports: exp};
  runnable(mod, exp);
  return mod.exports.call(this, base, filepath, callback);
};
