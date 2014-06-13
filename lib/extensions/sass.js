
var sass;

if (!process.versions || !process.versions['atom-shell']) {
  sass = require('node-sass');
}

var css = require('./css');
var path = require('path');
var debug = require('debug')('sear:sass');

exports.sass = function (base, filepath, data, callback) {
  var self = this;
  var file = path.resolve(path.join(this.options.input, base, filepath));
  var parts = file.split('/');
  parts.pop();

  debug('Processing SASS file %s %s', base, filepath);
  sass.render({
    data: data.toString(),
    success: function(cssContent){
     debug('Processed LESS file %s %s', base, filepath);
     css.css.call(self, base, filepath, cssContent, callback);
    },
    error: function(error) {
      callback(error);
    },
    includePaths: [ parts.join('/') ],
    outputStyle: this.options.minify ? 'compressed' : 'nested'
  });
};

exports.sync_sass = function () {
  // SASS doesnt work on atom-shell
  return "var style = module.exports = document.createElement('style');\n";
};
