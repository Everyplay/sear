var util = require('util');
var _ = require('lodash');
var UglifyJS = require('uglify-js');
var SearFile = require('./file');
var CombinedStream = require('combined-stream');

var debug = require('debug')('sear:module');

var SearModule = module.exports = function (name, sear, filesMap, includes, lazyload) {
  this.name = name;
  this.output_name = sear._cleanPath(name).replace(/\//g, '-');
  this.sear = sear;
  this.files = [];
  this.filesMap = filesMap;
  this.includes = includes;
  this.lazyload = lazyload;

  for (var file in filesMap) {
    filesMap[file].key = file;
    this.files.push(filesMap[file]);
  }

  var defineMap;
  this.sear._amdDefineMap = defineMap = this.sear._amdDefineMap || {};

  var mainFile = this.filesMap[this.name];

  var mainDefine = mainFile.ast.defineNode || mainFile.ast.body[0];
  defineMap[mainDefine.args[0].value] = '/' + this.output_name;
  defineMap['/' + this.output_name] = '/' + this.output_name;

  mainDefine.args[0].value = '/' + this.output_name;

  _.each(mainFile.loaded_by, function (loader) {
    loader.item.value = '/' + this.output_name;
  });
};

util.inherits(SearModule, SearFile);

SearModule.prototype.sortByDependencies = function () {
  this.files = _.sortBy(this.files, function (a, b) {
    return _.any(b.dependencies, {key: a.key}) ? -1 : 1;
  });

  for (var i = 0; i < this.files.length; i++) {
    var file = this.files[i];
    if (file.key === 'requirejs' || file.name === 'almond' || file.name === 'sear-require') {
      this.files.unshift(this.files.splice(i,1)[0]);
    }
  }
};

SearModule.prototype._combinedAST = function (options) {
  _.extend({}, options || {}, this.sear.options);

  var anonymousFunction = new UglifyJS.AST_Function({
    argnames: ['window', 'undefined'].map(function (item) {
      return new UglifyJS.AST_SymbolFunarg({name: item});
    }),
    body: _.flatten([
      this.includes.map(function (include) {
        return include.body;
      }),
      _.map(this.files, function (file) {
        return [UglifyJS.parse(';"' + file.key + '";').body, file.ast.body];
      }).reverse()
    ])
  });

  if (!this.lazyload) {
    anonymousFunction.body.push(new UglifyJS.AST_Call({
      expression: new UglifyJS.AST_SymbolRef({ name: 'require' }),
      args: [
        new UglifyJS.AST_Array({
          elements: [
            new UglifyJS.AST_String({value: '/' + this.name})
          ]
        })
      ]
    }));
  }

  var callExpr = new UglifyJS.AST_Call({
    expression: anonymousFunction,
    args: [new UglifyJS.AST_SymbolRef({ name: 'window' })]
  });

  var stat = new UglifyJS.AST_SimpleStatement({
    body: callExpr
  });

  var topLevel = new UglifyJS.AST_Toplevel({
    body: [stat]
  });

  return topLevel;
};

SearModule.prototype._optimizeAMDHeaders = function (toplevel, options) {
  var self = this;

  debug('Optimizing AMD headers');

  var defineName;
  var defineMap;

  this.sear._amdDefineMap = defineMap = this.sear._amdDefineMap || {};
  this.sear._amdHeaderId = this.sear._amdHeaderId || 0;

  var commonjsModules = ['require', 'exports', 'module'];

  var walker = new UglifyJS.TreeWalker(function(node){
    if (node instanceof UglifyJS.AST_Call && node.expression.name === 'define') {
      defineName = node.args[0].value;
      defineMap[defineName] = node.args[0].value = defineMap[defineName] || "m" + (++self.sear._amdHeaderId);

      if (node.args[1] && node.args[1].elements) {


        var cbArgs;
        if (node.args[2] instanceof UglifyJS.AST_Function) {
          cbArgs = _.pluck(node.args[2].argnames, 'name');
        }

        node.args[1].elements = _.filter(node.args[1].elements, function (item, indx) {
          var value = item.value;
          if (commonjsModules.indexOf(value) === -1) {
            defineMap[value] = item.value = defineMap[value] || "m" + (++self.sear._amdHeaderId);
            if (!cbArgs) {
              // Keep all deps if callback args could not be defined. Callback is a variable or other.
              return true;
            } else {
              return cbArgs[indx];
            }
          } else {
            return true;
          }
        });

        // If only commonjs stuff is defined we can remove those
        if (node.args[1].elements.length === 3 &&
          _.isEqual(_.pluck(node.args[1].elements, 'value'), commonjsModules)) {
          node.args.splice(1, 1);
        }
      }
    } else if (node instanceof UglifyJS.AST_Call &&
      (node.expression.name === 'require' || node.expression.name === 'lazyload')) {
      var item = node.args[0];

      if (item.elements) {
        item = item.elements[0];
      }

      var items;
      if (item.elements) {
        items = item.elements;
      } else {
        items = [item];
      }

      _.each(items, function (item) {
        var value = item.value;
        defineMap[value] = item.value = defineMap[value] || "m" + (++self.sear._amdHeaderId);
      });
    }
  });
  toplevel.walk(walker);
};

SearModule.prototype._processOutput = function (options) {
  var topLevel = this._combinedAST(options);

  var minifyOptions = options && options.minify_options ? options.minify_options : {};

  if (minifyOptions.optimize_amd) {
    this._optimizeAMDHeaders(topLevel, minifyOptions);
  }

  var source_map = UglifyJS.SourceMap({
    root: options.sourceRoot,
    file: options.name + '.js',
    orig: this.orig_sourcemaps
  });

  var stream = UglifyJS.OutputStream({
    source_map: source_map,
    beautify: true,
    comments: true
  });

  topLevel.print(stream);

  this.code = stream.toString();
  var sourcemapObject = JSON.parse(source_map.toString());
  this.sourcemap = sourcemapObject;
};

SearModule.prototype.minify = function (options) {
  debug('Minifying');

  var minifyOptions = options && options.minify_options ? options.minify_options : {};

  return UglifyJS.minify(this.code, _.extend({}, minifyOptions, {
      fromString: true
    }));
};

SearModule.prototype.toString = function (options) {
  options = _.extend({}, this.sear.options, options || {});

  if (!this.code) {
    this._processOutput(options);
  }

  if (options.minify) {
    return this.minify(options).code;
  } else {
    return this.code;
  }
};

SearModule.prototype.getSourceMap = function (options) {
  options = _.extend({}, this.sear.options, options || {});

  if (!this.sourcemap) {
    this._processOutput(options);
  }

  return this.sourcemap;
};

SearModule.prototype.reset = function () {
  delete this.code;
  delete this.sourcemap;
};

SearModule.prototype.output = function (options) {
  debug('%s output', this.name);
  options = _.extend({}, options || {}, this.sear.options);
  var self = this;
  var str = this.toString(options);
  var combinedStream = CombinedStream.create();

  combinedStream.append(str);

  return combinedStream;
};


SearModule.prototype.getFile = function (file) {
  return this.filesMap[file];
};
