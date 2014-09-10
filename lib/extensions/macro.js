var debug = require('debug')('sear:macro');
var _ = require('lodash');
var path = require('path');

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

exports.macro.updater = function (filepath, data, callback) {
  var self = this;

  debug('Processing MACRO %s %s', filepath);

  var module;

  try {
    module = require(filepath);
  } catch (e) {
    return callback(e);
  }

  if (module.updater) {
    module.updater.call(this, filepath, data, callback);
  } else {
    var filename = this._cleanPath(filepath);
    this.loadFile(filepath, _.bind(function (err, file) {
      if (err) {
        return console.log(err.stack || String(err));
      }

      var cleanFilename = this._cleanPath(filename).replace(/\.js$/, '');

      var options = this.options;

      options = _.extend({}, options, {
        add_includes: cleanFilename.substring(1) === options.name,
        add_load:  cleanFilename.substring(1) === options.name,
        sourceFile: cleanFilename.replace(/\.map$/, '')
      });

      var output = file.output(options);

      var data = "";

      output.on('data', function (chunk) {
        data += chunk.toString();
      });

      output.on('end', function () {

        var update = {
          devtool: [
            {
              type: 'swap', source: data
            }
          ],
          other: [
            {
              type: 'eval', eval: 'location.reload()'
            }
          ]
        };

        if (options.react_update) {
          var reactUpdate = update.devtool.push({
            type: 'eval',
            eval: self.updateServer.reactUpdate({
              module: filename
            })
          });
        }

        callback(null, update);
      });

      output.resume();
    }, this));
  }
};
