var util = require('util');
var _ = require('lodash');
var UglifyJS = require('uglify-js');
var CombinedStream = require('combined-stream');
var debug = require('debug')('sear:file');

var SearFile = module.exports = function (sear, options) {
  this.sear = sear;
  for (var key in options) {
    this[key] = options[key];
  }
};

SearFile.prototype.toString = function (options) {
  debug('%s toString', this.path);
  if (!this.code) {
    this._processOutput(options);
  }
  return this.code;
};

SearFile.prototype._processOutput = function (options) {
  options = _.extend({}, options || {}, this.sear.options);
  var path = this.sear._cleanPath(this.path);

  if (typeof this.orig_sourcemap !== "undefined") {
    if (typeof this.orig_sourcemap === "string") {
      this.orig_sourcemap = JSON.parse(this.orig_sourcemap);
    }

    this.orig_sourcemap.file = options.sourceFile || path;
    this.orig_sourcemap.sources = [path + '.raw'];
  }

  var source_map = UglifyJS.SourceMap({
    root: options.sourceRoot,
    file: options.sourceFile || path,
    orig: this.orig_sourcemap
  });

  var stream = UglifyJS.OutputStream({
    source_map: source_map,
    beautify: true,
    comments: true
  });

  this.ast.print(stream);

  this.code = stream.toString();

  var sourcemapObject = JSON.parse(source_map.toString());
  sourcemapObject.sources = [path + '.raw'];

  this.sourcemap = sourcemapObject;
};

SearFile.prototype.getSourceMap = function (options) {
  debug('%s source map', this.path);

  if (!this.sourcemap) {
    this._processOutput(options);
  }

  return this.sourcemap;
};

SearFile.prototype.outputSourceMap = function (options) {
    var combinedStream = CombinedStream.create();
    combinedStream.append(JSON.stringify(this.getSourceMap(options)));
    return combinedStream;
};

SearFile.prototype.output = function (options) {
  debug('%s output', this.path);
  options = _.extend({}, options || {}, this.sear.options);
  var self = this;
  var str = this.toString(options);
  var combinedStream = CombinedStream.create();

  if (options.add_includes) {
    combinedStream.append(function (next) {
      self.sear._getIncludes(function (err, content) {
        next((content || '') + '\n');
      });
    });
  }

  combinedStream.append(str);

  if (options.add_load) {
    combinedStream.append('\nrequire(["/' + options.name + '"]);');
  }

  return combinedStream;
};
