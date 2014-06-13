var less = require('less');
var css = require('./css');
var path = require('path');
var debug = require('debug')('sear:less');

exports.less = function (base, filepath, data, callback) {

  var self = this;

  var parts = path.join(base, filepath).split('/');
  parts.pop();

  var parser = new(less.Parser)({
    paths: [this.options.input.replace(/\/$/, "") + '/' + parts.join('/')],
    // Specify search paths for @import directives
    filename: filepath // Specify a filename, for better error messages
  });

  debug('Processing LESS file %s %s', base, filepath);
  parser.parse(data.toString(), function (err, tree) {
    if (err) {
      debug('Error processing less %s %s %s', base, filepath, err);
      return callback(err);
    }

    debug('Converting less tree to css %s %s', base, filepath);

    try {
      data = tree.toCSS({
        compress: self.options.minify
      });
    } catch (e) {
      debug('Error converting less tree to css %s', e);
    }

    debug('Processed LESS file %s %s', base, filepath);

    css.css.call(self, base, filepath, data, callback);
  });
};

exports.sync_less = function () {
  return "var style = module.exports = document.createElement('style');\n";
};
