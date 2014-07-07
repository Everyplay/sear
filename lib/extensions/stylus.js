var stylus = require('stylus');
var nib = require('nib');
var css = require('./css');
var path = require('path');
var debug = require('debug')('sear:stulus');


exports.styl = function (file, data, callback) {

  var self = this;

  debug('Processing stylus file %s', file);
  stylus(data.toString(), { filename: file }).use(nib()).render(function (err, styl) {
    if (err) {
      return callback(err);
    }

    debug('Processed stylus file %s', file);

    data = styl;

    css.css.call(self, file, data, callback);
  });
};

exports.styl.updater = function (file, data, callback) {
  var self = this;

  debug('Processing stylus file %s', file);
  stylus(data.toString(), { filename: file }).use(nib()).render(function (err, styl) {
    if (err) {
      return callback(err);
    }

    debug('Processed stylus file %s', file);

    data = styl;

    css.css.updater.call(self, file, data, callback);
  });
};
