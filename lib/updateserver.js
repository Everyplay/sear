var sockjs = require('sockjs');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var extname = path.extname;

var UpdateServer = module.exports = function (sear, fileWatcher, server, options) {
  this.sear = sear;
  this.options = options;
  this.server = server;
  this.fileWatcher = fileWatcher;

  fileWatcher.on('update', _.bind(this._fileUpdated, this));

  if (this.sear.options.react_update) {
    this.reactUpdate = _.template(
      fs.readFileSync(
        require.resolve('./includes/reactupdater.js')
      )
    );
  }

  this.connections = [];

  this.sockServer = sockjs.createServer(options.sockjs_opts);
  this.sockServer.installHandlers(server, {prefix: '/sear_sock'});
  this.sockServer.on('connection', _.bind(function(conn) {
    this.connections.push(conn);
    conn.on('close', _.bind(function () {
      this.connections = _.without(this.connections, conn);
    }, this));
  }, this));
};

UpdateServer.prototype._fileUpdated = function (cleanFilename, stats) {
  this._createUpdate(cleanFilename, _.bind(function (err, update) {
    if (err) {
      return console.log(err.stack || String(err));
    }

    this.broadcast({
      type: 'update',
      module: cleanFilename,
      update: update
    });

  }, this));
};

UpdateServer.prototype.broadcast = function (data) {
  _.each(this.connections, function (conn) {
    conn.write(JSON.stringify(data));
  });
};

UpdateServer.prototype._getUpdater = function (file) {
  var ext = extname(file) || '.js';
  ext = ext.substr(1);
  return this.sear.updaters[ext];
};

UpdateServer.prototype._createUpdate = function (filename, callback) {
  var self = this;
  var updater = this._getUpdater(filename);
  if (updater) {
    this.sear._getFileContent('', filename, _.bind(function (err, data) {
      if (err) {
        return console.log(err.stack || String(err));
      }

      updater(path.join(this.sear.options.input, filename), data, callback);
    }, this));
  } else {
    this.sear.loadFile(filename, _.bind(function (err, file) {
      if (err) {
        return console.log(err.stack || String(err));
      }

      var cleanFilename = this.sear._cleanPath(filename).replace(/\.js$/, '');

      var options = this.sear.options;

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

        if (self.sear.options.react_update) {
          var reactUpdate = update.devtool.push({
            type: 'eval',
            eval: self.reactUpdate({
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

UpdateServer.prototype.getClient = function (callback) {
  fs.readFile(require.resolve('./includes/updateclient.js'), callback);
};
