var _ = require('lodash');
var path = require('path');
var debug = require('debug')('sear:bundle');

var SearModule = require('./module');

var SearBundle = module.exports = function (name, sear, filesMap, includes) {
  this.name = name;
  this.sear = sear;
  this.filesMap = filesMap;
  this.includes = includes;
  this.lazyloaded = [];
  this.modules = [];

  function check(loadedBy) {
    return loadedBy.type === 'lazyload';
  }

  for (var file in filesMap) {
    var fileObj = filesMap[file];
    fileObj.key = file;
    if (_.filter(fileObj.loaded_by, check).length > 0) {
      this.lazyloaded.push(file);
    }
  }

  var mainFiles = this.getModuleFiles(this.name, {});
  this.modules.push(new SearModule(name, sear, mainFiles, includes, false));

  _.each(this.lazyloaded, function (mod) {
    var files = this.getModuleFiles(mod, mainFiles);
    this.modules.push(new SearModule(mod, sear, files, [], true));
  }, this);
};

SearBundle.prototype.getModuleFiles = function (name, ignore) {
  var files = {};
  files[name] = this.filesMap[name];
  if (this.filesMap[name]) {
    _.each(this.filesMap[name].dependencies, function (dep) {
      if (dep.type !== 'lazyload') {
        var depPath = path.relative(this.sear.options.input, dep.key).replace(/\.js$/, '');
        if (!files[depPath] && !ignore[depPath]) {
          files[depPath] = this.filesMap[depPath];
          // Might be better to pass as arguments
          _.extend(files, this.getModuleFiles(depPath, _.extend({}, ignore, files)));
        }
      }
    }, this);
  }
  return files;
};
