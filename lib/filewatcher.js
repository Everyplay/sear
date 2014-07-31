var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var chokidar = require('chokidar');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var extname = path.extname;

var FileWatcher = module.exports = function (sear, options) {
  EventEmitter.call(this);

  this.sear = sear;
  this.options = options;
  this.subscribes = {};
  this.emitPaths = {};
  this.watcher = chokidar.watch([]);
  this.watcher.on('change', _.bind(this._fileUpdated, this));
};

util.inherits(FileWatcher, EventEmitter);

FileWatcher.prototype._fileUpdated = function (path, stats) {
  var cleanFilename = this.sear._cleanPath(path);
  _.each(this.emitPaths[cleanFilename], function (cleanFilename) {
    this.emit('update', cleanFilename, stats);
  }, this);
};

FileWatcher.prototype.subscribe = function (filepath, emitPath) {
  var cleanFilename = this.sear._cleanPath(filepath);
  emitPath = emitPath ? this.sear._cleanPath(emitPath) : cleanFilename;
  this.emitPaths[cleanFilename] = this.emitPaths[cleanFilename] || [];
  if (this.emitPaths[cleanFilename].indexOf(emitPath) === -1) {
    this.emitPaths[cleanFilename].push(emitPath);
  }

  if (this.subscribes[cleanFilename]) {
    return;
  }

  this.subscribes[cleanFilename] = true;
  this.watcher.add(filepath);
};
