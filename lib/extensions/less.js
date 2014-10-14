var less = require('less');
var css = require('./css');
var path = require('path');
var _ = require('lodash');
var debug = require('debug')('sear:less');

exports.less = function (filepath, data, callback) {

  var self = this;

  var parts = filepath.split('/');
  parts.pop();

  var parser = new(less.Parser)({
    paths: [parts.join('/')],
    // Specify search paths for @import directives
    filename: filepath // Specify a filename, for better error messages
  });

  debug('Processing LESS file %s', filepath);
  parser.parse(data.toString(), function (err, tree) {
    if (err) {
      debug('Error processing less %s %s', filepath, err);
      return callback(err);
    }

    debug('Converting less tree to css %s', filepath);

    try {
      data = tree.toCSS({
        compress: self.options.minify
      });
    } catch (e) {
      debug('Error converting less tree to css %s', e);
    }

    debug('Processed LESS file %s', filepath);

    if (self.fileWatcher) {
      var files = _.filter(
        _.map(tree.rules, function (rule) {
          return rule.importedFilename;
        }),
        function (file) {
          return file;
        });

        _.each(files, function (file) {
          debug('Adding file watcher %s => %s', file, filepath);
          this.fileWatcher.subscribe(file, filepath);
        }, self);

      }
      css.css.call(self, filepath, data, callback);
    }, {
      modifyVars: {
        '@node-env': process.env.NODE_ENV || 'development'
      }
    });
  };

  exports.less.updater = function (filepath, data, callback) {

    var self = this;

    var parts = filepath.split('/');
    parts.pop();

    var parser = new(less.Parser)({
      paths: [parts.join('/')],
      // Specify search paths for @import directives
      filename: filepath // Specify a filename, for better error messages
    });

    debug('Processing LESS file %s', filepath);
    parser.parse(data.toString(), function (err, tree) {
      if (err) {
        debug('Error processing less %s %s', filepath, err);
        return callback(err);
      }

      debug('Converting less tree to css %s', filepath);

      try {
        data = tree.toCSS({
          compress: self.options.minify
        });
      } catch (e) {
        debug('Error converting less tree to css %s', e);
      }

      debug('Processed LESS file %s', filepath);

      css.css.updater.call(self, filepath, data, callback);
    },{
      modifyVars: {
        '@node-env': process.env.NODE_ENV || 'development'
      }
    });
  };
