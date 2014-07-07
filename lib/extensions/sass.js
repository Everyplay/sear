
var sass;

if (!process.versions || !process.versions['atom-shell']) {
  sass = require('node-sass');
}

var css = require('./css');
var path = require('path');
var debug = require('debug')('sear:sass');

exports.sass = function (filepath, data, callback) {
  var self = this;
  var file = filepath;
  var parts = file.split('/');
  parts.pop();

  debug('Processing SASS file %s', filepath);
  sass.render({
    data: data.toString(),
    success: function(cssContent){
     debug('Processed LESS file %s', filepath);
     css.css.call(self, filepath, cssContent, callback);
    },
    error: function(error) {
      callback(error);
    },
    includePaths: [ parts.join('/') ],
    outputStyle: this.options.minify ? 'compressed' : 'nested'
  });
};

exports.sass.updater = function (filepath, data, callback) {
  var self = this;
  var file = filepath;
  var parts = file.split('/');
  parts.pop();

  debug('Processing SASS file %s', filepath);
  sass.render({
    data: data.toString(),
    success: function(cssContent){
     debug('Processed LESS file %s', filepath);
     css.css.updater.call(self, filepath, cssContent, callback);
    },
    error: function(error) {
      callback(error);
    },
    includePaths: [ parts.join('/') ],
    outputStyle: this.options.minify ? 'compressed' : 'nested'
  });
};
