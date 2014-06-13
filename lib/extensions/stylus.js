var stylus = require('stylus');
var nib = require('nib');
var css = require('./css');
var path = require('path');
var debug = require('debug')('baker:stulus');


exports.styl = function (base, filepath, data, callback) {

  var self = this;
  var file = path.resolve(path.join(this.options.input, base, filepath));

  debug('Processing stylus file %s %s', base, filepath);
  stylus(data.toString(), { filename: file }).use(nib()).render(function (err, styl) {
    if (err) {
      return callback(err);
    }

    debug('Processed stylus file %s %s', base, filepath);

    data = styl;

    css.css.call(self, base, filepath, data, callback);
  });
};