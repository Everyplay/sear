var events = require('events');
var util = require('util');
var path = require('path');
var normalize = path.normalize;
var exec = require('child_process').exec;
var extname = path.extname;
var _ = require('lodash');
var fs = require('fs');
var UglifyJS = require('uglify-js');
var express = require('express');
var CombinedStream = require('combined-stream');
var send = require('send');
var url = require('url');
var es = require('event-stream');
var resolve = require('resolve');
var commands = require('./utils/commands');

var debug = require('debug')('sear');


var SearFile = function (sear, options) {
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

var SearModule = function (name, sear, filesMap, includes) {
  this.name = name;
  this.sear = sear;
  this.files = [];
  this.filesMap = filesMap;
  this.includes = includes;

  for (var file in filesMap) {
    filesMap[file].key = file;
    this.files.push(filesMap[file]);
  }
};

util.inherits(SearModule, SearFile);

SearModule.prototype.sortByDependencies = function () {
  this.files = _.sortBy(this.files, function (a, b) {
    return _.any(b.dependencies, {key: a.key}) ? -1 : 1;
  });

  for (var i = 0; i < this.files.length; i++) {
    var file = this.files[i];
    if (file.key == 'requirejs' || file.name == 'almond') {
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
      this.includes,
      _.map(this.files, function (file) {
        return [UglifyJS.parse(';"' + file.key + '";').body, file.ast.body];
      }).reverse()
    ])
  });

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


        var cbArgs = [];
        if (node.args[2] instanceof UglifyJS.AST_Function) {
          cbArgs = _.pluck(node.args[2].argnames, 'name');
        }

        node.args[1].elements = _.filter(node.args[1].elements, function (item, indx) {
          var value = item.value;
          if (commonjsModules.indexOf(value) === -1) {
            defineMap[value] = item.value = defineMap[value] || "m" + (++self.sear._amdHeaderId);
            return cbArgs[indx];
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

SearModule.prototype.minify = function (options) {
  debug('Minifying');
  var minifyOptions = options && options.minify_options ? options.minify_options : {};

  var topLevel = this._combinedAST(options);

  if (minifyOptions.optimize_amd) {
    this._optimizeAMDHeaders(topLevel, minifyOptions);
  }

  return UglifyJS.minify(
    topLevel.print_to_string(
      {
        beautify: true,
        comments: true
      }), _.extend({}, minifyOptions, {
      fromString: true
    }));
};

SearModule.prototype.toString = function (options) {
  options = _.extend({}, options || {}, this.sear.options);

  if (options.minify) {
    return this.minify(options).code;
  } else {
    var topLevel = this._combinedAST(options);
    return topLevel.print_to_string({beautify: true, comments: true});
  }
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

var Sear = function (options) {
  var self = this;

  options = options || {};

  events.EventEmitter.call(this);
  this.options = options || {};

  this.options.input = path.resolve(this.options.input || '.');
  this.options.bower_components = options.bower_components || 'bower_components';
  this.options.node_modules = options.node_modules || 'node_modules';

  this.extensions = {};
  this.walkers = {};
  this.filePaths = {};
  this.commands = {};

  _.map(commands, function (fn, name) {
    self.commands[name] = _.bind(fn, self);
  });

  this.registerExtension(require('./extensions/javascript'));
  this.registerExtension(require('./extensions/jsx'));
  this.registerExtension(require('./extensions/coffee'));
  this.registerExtension(require('./extensions/css'));
  this.registerExtension(require('./extensions/less'));
  this.registerExtension(require('./extensions/stylus'));
  this.registerExtension(require('./extensions/markdown'));
  this.registerExtension(require('./extensions/haml'));
  this.registerExtension(require('./extensions/html'));
  this.registerExtension(require('./extensions/json'));
  this.registerExtension(require('./extensions/sass'));
  this.registerExtension(require('./extensions/macro'));
};

util.inherits(Sear, events.EventEmitter);

Sear.prototype.registerExtension = function (extension) {
  for (var fileExtension in extension) {
    this.extensions[fileExtension] = extension[fileExtension].bind(this);
    if (extension[fileExtension].createWalker) {
      this.walkers[fileExtension] = extension[fileExtension].createWalker.bind(this);
    }
  }
};

Sear.prototype.nodeInstall = function () {
  var self = this;
  _.each(this.extensions, function (extension, ext) {
    var isSync = ext.indexOf('sync_') === 0;
    if (isSync) {
      ext = ext.substr(5);
    }

    if (!isSync && self.extensions['sync_' + ext]) {
      return;
    }

    require.extensions['.' + ext] = function(module, filename) {
      var src = fs.readFileSync(filename, {encoding: 'utf8'});

      var result = extension("", filename, src, function (err, data) {
        if (err) {
          throw err;
        }

        src = data;
      });

      if (typeof result !== 'undefined') {
        src = result;
      }

      module._compile(src, filename);
    };
  });
};

Sear.prototype.build = function (module, callback) {
  var self = this;
  var files = {};

  if (arguments.length == 1) {
    callback = module;
    module = this.options.name;
  }

  debug("Building %s", module);

  if (!module) {
    return callback(new Error("Module name not specified"));
  }

  (function loadFile(base, filename, callback) {
    filename = filename.replace(/\.js$/, '');

    self._resolve(base, filename, function (err, filePath) {
      if (err) {
        return callback(err);
      }

      if (filePath) {
        filePath = path.relative(self.options.input, filePath).replace(/\.js$/, '');
      }

      if (files[filePath]) {
        return callback();
      }

      self.loadFile(base, filename, function (err, details) {
        if (err) {
          err.file = path.join(base, filename);
          return callback(err);
        }

        files[filePath] = details;

        debug("Going trough file dependencies %s %s", base, filename);

        (function nextDep(i) {
          var dep = details.dependencies[i];

          if (!dep) {
            return callback();
          }

          var depBase = path.relative(self.options.input, details.path).split('/');
          depBase.pop();
          depBase = depBase.join('/');
          var depFilename = dep.path;

          debug("Dependency %s %s", depBase, depFilename);

          self._resolve(depBase, depFilename, function (err, depPath) {
            dep.key = depPath;
            loadFile(depBase, depFilename, function (err) {
              if (err) {
                return callback(err);
              }

              nextDep(++i);
            });
          });
        })(0);
      });
    });
  })('', './' + module, function (err) {
    self._getIncludes(function (err, includes) {
      if (err) {
        return callback(err);
      }
      self._toAST(includes, function (err, includes) {
        if (err) {
          return callback(err);
        }
        callback(err, new SearModule(module, self, files, includes));
      });
    });
  });
};

Sear.prototype._getIncludes = function (callback) {
  var includes = this.options.includes || [];
  var contents = [];

  var self = this;

  (function nextInclude(i) {
    var include = includes[i];
    if (!include) {
      return callback(null, contents.join('\n'));
    }

    self._getFileContent('', include, function (err, data) {
      if (err) {
        return callback(err);
      }

      contents.push(data.toString());
      nextInclude(++i);
    });
  })(0);
};

Sear.prototype._cleanPath = function (p) {
  if (p.indexOf('node_modules')  > -1) {
    p = p.split('node_modules').pop();
  }

  if (p.indexOf('bower_components')  > -1) {
    p = p.split('bower_components').pop();
  }

  if (p.indexOf(this.options.node_modules) === 0) {
    p = p.substr(this.options.node_modules.length);
  } else if (p.indexOf(this.options.bower_components) === 0) {
    p = p.substr(this.options.bower_components.length);
  } else if (p.indexOf(path.join(this.options.input, this.options.node_modules)) === 0) {
    p = p.substr(path.join(this.options.input, this.options.node_modules).length);
  } else if (p.indexOf(path.join(this.options.input, this.options.bower_components)) === 0) {
    p = p.substr(path.join(this.options.input, this.options.bower_components).length);
  } else if(p.indexOf(this.options.input) === 0) {
    p = p.substr(this.options.input.length);
  }

  return p;
};

Sear.prototype._resolve = function (base, filepath, callback) {
  debug("Resolving %s %s", base, filepath);

  filepath = this._cleanPath(filepath);

  var fullPath = path.join(base, filepath);

  if (this.filePaths[fullPath]) {
    debug("Resolved %s = %s", fullPath, this.filePaths[fullPath]);
    return callback(null, this.filePaths[fullPath]);
  }

  var resolveFile = function (base, filepath) {
    filepath = this._cleanPath(filepath);

    if (filepath.indexOf('/') === 0) {
      filepath = filepath.substr(1);
    }

    var opts = {
      moduleDirectory: this.options.resolve_module_directories || [this.options.bower_components, this.options.node_modules],
      basedir: base,
      extensions: _.keys(this.extensions).map(function (ext) {
        return '.' + ext;
      })
    };


    resolve(filepath, opts, function (err, res) {
      if (err) {
        return callback(err);
      }
      this.filePaths[fullPath] = res;
      debug("Resolved %s = %s", fullPath, this.filePaths[fullPath]);
      callback(err, res);
    }.bind(this));
  }.bind(this);

  if (filepath.indexOf('/') === -1) {
    resolveFile(this.options.input, filepath);
  } else if(base) {
    if (base.indexOf('.') === 0) {
      base = base.substr(1);
    }

    if (base.indexOf('/') === 0) {
      base = base.substr(1);
    }

    this._resolve('', base, function (err, baseFullPath) {
      if (baseFullPath) {
        var parts = path.relative(this.options.input, baseFullPath).split('/');
        parts.pop();
        filepath = path.join(parts.join('/'), filepath);
        base = this.options.input;
      } else {
        base = path.join(this.options.input, base);
      }

      resolveFile(base, filepath);
    }.bind(this));

  } else {
    resolveFile(this.options.input, filepath);
  }
};

Sear.prototype._getExtension = function (file) {
  var ext = extname(file) || '.js';
  ext = ext.substr(1);
  return this.extensions[ext] || function (base, filepath, data, callback) {
    callback(new Error('No extension for ' + ext + '-files'), data);
  };
};

Sear.prototype._getWalker = function (file) {
  var ext = extname(file) || '.js';
  ext = ext.substr(1);
  return this.walkers[ext] || function (base, filepath, node) {
    return function () {};
  };
};

Sear.prototype._transform = function (base, filepath, data, callback) {
  debug('Transforming %s %s', base, filepath);
  this._getExtension(filepath)(base, filepath, data, callback);
};

Sear.prototype._wrap = function (details, callback) {
  debug('Wrapping %s %s', details.base, details.relative_path);

  var self = this;

  this._isPackage(details.base, details.relative_path, function (err, isPackage) {
    if (err) {
      return callback(err);
    }

    debug('%s %s %s', details.base, details.relative_path, isPackage ? 'is a package' : 'not a package');

    var name;
    if (isPackage) {
      if (details.relative_path.indexOf('.') === 0 || details.relative_path.indexOf('/') === 0) {
        name = path.join(details.base, details.relative_path);
      } else {
        name = details.relative_path;
      }

      var parts = name.split('/').filter(function (part) { return !!part; });
      // Hax to fix direct references to index file
      if (parts.length > 1) {
        var baseModuleName = parts[0];
        debug('checking if %s %s refers to the main of the package ', details.base, details.relative_path);
        self._resolve('', baseModuleName, function (err, path) {
          if (details.path == path) {
            name = baseModuleName;
            debug('%s %s refers to the root file', details.base, details.relative_path);
          }

          wrap();
        });
      } else {
        wrap();
      }
    } else {
      name = details.path.substr(self.options.input.length).replace(/\.js$/, '');
      wrap();
    }

    function wrap() {

      name = self._cleanPath(name).replace(/\/index$/, '');

      if (name.indexOf('/') !== 0) {
        name = '/' + name;
      }

      var requires = ['require', 'exports', 'module'];
      _.each(details.dependencies, function (dep) {
        var value = dep.item.value;
        if (value.indexOf('/') !== 0) {
          value = '/' + value;
        }
        dep.item.value = value;
        if (dep.type === 'require') {
          requires.push(value);
        }
      });

      requires = _.uniq(requires);

      if (details.ast.defineNode && details.ast.defineNode.args[0] && details.ast.defineNode.args[0].elements) {
        details.ast.defineNode.args.unshift(new UglifyJS.AST_String({value: name}));
      }

      var defineDeps = _.where(details.dependencies, {type: 'define'});
      if (defineDeps.length > 0) {
        return callback(null, details);
      }

      var argnames = ['require', 'exports', 'module'].map(function (item) {
        return new UglifyJS.AST_SymbolFunarg({name: item});
      });

      var requireAst = new UglifyJS.AST_Array({elements: requires.map(function (item) {
        return new UglifyJS.AST_String({value: item});
      })});

      var nameAst = new UglifyJS.AST_String({value: name});

      if (details.ast.defineNode) {
        var amdcallback = details.ast.defineNode.args.pop();
        details.ast.defineNode.args = [
          nameAst,
          requireAst,
          amdcallback
        ];
      } else {
        var anonymousFunction = new UglifyJS.AST_Function({
          argnames: argnames,
          body: details.ast.body
        });

        details.ast.body = [
          new UglifyJS.AST_Call({
            expression: new UglifyJS.AST_SymbolRef({ name: 'define' }), args: [
            nameAst,
            requireAst,
            anonymousFunction
          ]
          })
        ];
      }

      callback (null, details);
    }
  });
};

Sear.prototype._getDependencyName = function (dep, base, filepath) {
  if (this.options.dependency_overrides && typeof this.options.dependency_overrides[dep] !== 'undefined') {
    return this.options.dependency_overrides[dep];
  }

  return dep;
};

Sear.prototype._walk = function (base, filepath, basenode, filename, callback) {
  var dependencies = [];
  var self = this;

  debug('Resolving dependencies %s %s', base, filepath);

  var extWalker = this._getWalker(filepath)(base, filepath, basenode);

  var walker = new UglifyJS.TreeWalker(function(node){
    if (node instanceof UglifyJS.AST_Call && node.expression.name === 'define') {
      basenode.defineNode = node;
      var elements = (node.args[0] && node.args[0].elements) ?
        node.args[0].elements : ((node.args[1] && node.args[1].elements) ? node.args[1].elements : null);

      if (elements) {
        _.each(elements, function (item) {
          var value = item.value = self._getDependencyName(item.value, base, filepath);
          // TODO add support of totally removing the dependency
          if (['module', 'exports', 'require'].indexOf(value) === -1) {
            dependencies.push({path: value, type: node.expression.name, item: item});
          }
        });
      }
    } else if (node instanceof UglifyJS.AST_Call &&
      (node.expression.name === 'require' ||  node.expression.name === 'lazyload')) {
      var item = node.args[0];
      // TODO add support of totally removing the dependency
      var value = item.value = self._getDependencyName(item.value, base, filepath);
      dependencies.push({path: value, type: node.expression.name, item: item});
    }

    extWalker(node);
  });
  basenode.walk(walker);

  // TODO this should be moved to a better place

  (function nextDep(i) {
    var dep = dependencies[i];

    if (!dep) {
      dependencies = _.uniq(dependencies, null, function (item) {
        return item.type + '-' + item.path;
      });
      return callback(null, dependencies);
    }

    if (dep.path.indexOf('.') === -1 && dep.path.indexOf('/') === -1) {
      dep.item.value = '/' + dep.path;
      return nextDep(++i);
    }

    var fullBaseName = filename.split('/');
    fullBaseName.pop();
    fullBaseName = fullBaseName.join('/');

    debug('Resolving full path for %s %s', fullBaseName, dep.path);
    self._resolveFileName(path.relative(self.options.input, fullBaseName), dep.path, function (err, fpath) {
      if (err) {
        debug(err);
        return nextDep(++i);
      }

      debug('Resolved full path for %s %s = ', fullBaseName, dep.path, fpath);


        var baseModule = self._cleanPath(fullBaseName).split('/').filter(function (part) { return !!part; }).shift();
      if (baseModule) {
        debug('Checking if dependency refers to main file %s %s', fullBaseName, dep.path);
        self._resolveFileName('', baseModule, function (err, basePath) {
          if (fpath == basePath) {
            dep.item.value = '/' + baseModule;
          } else {
            dep.item.value = self._cleanPath(fpath).replace(/\.js$/, '').replace(/\/index$/, '');
          }

          nextDep(++i);
        });
      } else {
        dep.item.value = self._cleanPath(fpath).replace(/\.js$/, '').replace(/\/index$/, '');
        nextDep(++i);
      }

    });
  })(0);
};

Sear.prototype._getFileContent = function (base, filepath, callback) {
  debug('Getting file contents %s %s', base, filepath);
  this._resolveFileName(base, filepath, function (err, path) {
    if (err || !path) {
      if (!err) {
        err = new Error('No such path');
        err.code = 404;
      }
      return callback(err);
    }

    fs.stat(path, function (err, stat) {
      fs.readFile(path, function (err, data) {
        callback(err, data, path, stat && stat.mtime ? stat.mtime : 0);
      });
    });
  });
};

Sear.prototype._toAST = function (data, callback) {
  debug('Converting source to AST');
  var ast;
  try {
    ast = UglifyJS.parse(data.toString(), {html5_comments: true});
  } catch(e) {
    return callback(e);
  }

  callback(null, ast);
};

Sear.prototype.loadFile = function (base, filepath, callback) {
  if (arguments.length == 2) {
    callback = filepath;
    filepath = base;
    base = '';
  }

  debug('Loading file %s %s', base, filepath);

  var self = this;

  this._getFileContent(base, filepath, function (err, data, filename, modified) {
    if (err) {
      return callback(err);
    }

    self._transform(base, filepath, data, function (err, data, sourcemap) {
      if (err) {
        return callback(err);
      }

      self._toAST(data, function (err, ast) {
        if (err) {
          return callback(err);
        }

        self._walk(base, filepath, ast, filename, function (err, dependencies) {
          if (err) {
            return callback(err);
          }

          self._wrap({
            orig_sourcemap: sourcemap,
            base: base,
            relative_path: filepath,
            path: filename,
            ast: ast,
            content: data,
            dependencies: dependencies,
            modified: modified
          }, function (err, details) {
            if (err) {
              return callback(err);
            }

            callback(null, new SearFile(self, details));
          });
        });
      });
    });
  });
};

Sear.prototype._isPackage = function (base, filepath, callback) {
  this._resolve(base, filepath, function (err, file) {
    if (file && (file.indexOf(this.options.node_modules) > -1 ||
    file.indexOf(this.options.bower_components)) > -1) {
      return callback(null, true, this._cleanPath(path.relative(this.options.input, file)));
    }

    callback(null, false);
  }.bind(this));
};

Sear.prototype._resolveFileName = function (base, filepath, callback) {
  this._resolve(base, filepath, function (err, path) {
    if (err && err.message.indexOf('Cannot find module ') === 0 && (filepath.indexOf('.') !== 0 && !base)) {

      if (filepath.indexOf('/') === -1) {
        filepath = '/' + filepath;
      }

      filepath = '.' + filepath;


      return this._resolveFileName(base, filepath, callback);
    } else if (err) {
      err.code = err.message.indexOf('Cannot find module ') === 0 ? 404 : 0;

      if (err.code === 404 && base && !base.match(/\/$/)) {
        return this._resolve(base + '/', filepath, function (err, path) {
          if (err) {
            err.code = err.message.indexOf('Cannot find module ') === 0 ? 404 : 0;
          }

          callback(err, path);
        }.bind(this));
      }
    }

    callback(err, path);
  }.bind(this));
};

Sear.prototype._getAssetDirs = function (callback) {
  var self = this;

  if (this._assetDirs) {
    return callback(null, this._assetDirs);
  }

  var dirs = [];

  if (this.options.assets) {
    dirs.push(path.resolve(path.join(this.options.input, this.options.assets)));
  }
  var moduleDirs = [this.options.bower_components, this.options.node_modules];

  (function nextModuleDir(x) {
    var moduleDir = moduleDirs[x];
    if (!moduleDir) {
      self._assetDirs = dirs;
      return callback(null, dirs);
    }

    fs.exists(moduleDir + '/', function (exists) {
      if (!exists) {
        return callback(null, dirs);
      }

      fs.readdir(moduleDir + '/', function (err, components) {
        if (err) {
          return callback(err);
        }

        (function nextComponent(i) {
          var component = components[i];

          if (!component) {
            return nextModuleDir(++x);
          }

          fs.exists(moduleDir + '/' + component + '/sear.json', function (exists) {
            if (!exists) {
              return nextComponent(++i);
            }

            fs.readFile(moduleDir + '/' + component + '/sear.json', function (err, data) {
              if (err) {
                return callback(err);
              }

              var config = JSON.parse(data.toString());
              if (config.assets) {
                dirs.push(
                  path.resolve(path.join(moduleDir + '/' + component, config.input, config.assets))
                );
              }
              nextComponent(++i);
            });
          });
        })(0);
      });
    });

  })(0);
};

Sear.prototype._generateId = function (callback) {
  var self = this;

  if (this._id) {
    return callback(null, this._id);
  }

  exec('git rev-list -1 HEAD', function (e, stdout) {
    if (e) {
      return callback(e);
    }
    var rev = stdout.replace(/\s/g, '');
    self._id = rev ? rev : Date.now();
    callback(null, self._id);
  });
};

Sear.prototype.getIndex = function (options) {
  if (this._index) {
    return this._index;
  }

  options = _.extend({}, this.options, options);
  var index;
  if (this.options.index) {
    index = path.join(this.options.input, this.options.index);
  }

  if (!index) {
    return null;
  }

  var data = fs.readFileSync(index);

  this._index = _.template(data.toString(), options);

  return this._index;
};

// Express app stuff

Sear.prototype._pushState = function (options) {
  var index;
  if (this.options.index) {
    index = path.join(this.options.input, this.options.index);
  }

  index = this.getIndex(options);

  return function (req, res, next) {
    if ('GET' != req.method || !index) return next();
    res.send(index);
  };
};

Sear.prototype._staticAssets = function (options) {
  var self = this;
  var redirect = false !== options.redirect;

  return function (req, res, next) {
    if ('GET' != req.method) return next();
    var path = url.parse(req.url).pathname;

    self._getAssetDirs(function (err, dirs) {
      if (err) {
        return next(err);
      }

      (function nextAssetDir(i) {
        var assetDir = dirs[i];
        if (!assetDir) {
          return next();
        }

        send(req, path)
          .maxage(options.maxAge || 0)
          .root(assetDir)
          .hidden(options.hidden)
          .on('error', function (err) {
            if (404 == err.status) return nextAssetDir(++i);
            next(err);
          })
          .on('directory', function () {
            nextAssetDir(++i);
          })
          .pipe(res);

      })(0);
    });
  };
};

Sear.prototype._loader = function (options) {
  function getFileName(pathname) {
    return pathname.replace(/\.raw$/, '').replace(/\.map$/, '').replace(/\.js$/, '');
  }

  function isRawFileRequest(pathname) {
    return !!pathname.match(/\.raw$/);
  }

  function isMapFileRequest(pathname) {
    return !!pathname.match(/\.map$/);
  }

  var files = {};

  function loadFile(filename, filepath, callback) {
    var file = files[filename];

    function bakeFile() {
      self.loadFile('', filename, function (err, file) {
        if (err) {
          return callback(err);
        }

        files[filename] = file;
        callback(null, file);
      });
    }

    if (file) {
      fs.stat(filepath, function (err, stat) {
        if (err) {
          return callback(err);
        }

        if (file.modified.getTime() == stat.mtime.getTime()) {
          debug('Returning %s from cache', filename);
          callback(null, file);
        } else {
          debug('Not in cache %s', filename);
          bakeFile();
        }
      });
    } else {
      bakeFile();
    }
  }

  var self = this;

  return function (req, res, next) {
    if ('GET' != req.method) return next();
    var pathname = url.parse(req.url).pathname;

    if (pathname === '/') {
      return next();
    }

    var filename = getFileName(pathname);

    self._resolveFileName('', filename, function (err, path) {
      if (err) {
        if (err.code === 404) {
          return next();
        }
        return next(err);
      }

      if (!path) {
        return next();
      }

      if (isRawFileRequest(pathname)) {
        debug('Sending raw version of %s', pathname);
        res.sendfile(path);
        return;
      }

      options = _.extend({}, options, {
        add_includes: filename.substring(1) == options.name,
        add_load:  filename.substring(1) == options.name,
        sourceFile: pathname.replace(/\.map$/, '')
      });

      loadFile(filename, path, function (err, file) {
        if (err) {
          return next(err);
        }

        var output;

        if (isMapFileRequest(pathname)) {
          output = file.outputSourceMap(options);
        } else {
          output = file.output(options);
        }

        var filedata = "";

        es.pipeline(
          output,
          es.through(function write(data) {
              filedata += data.toString();
              this.emit('data', data);
            },
            function end () {
              res.writeHead(200, {
                'content-length': Buffer.byteLength(filedata, 'utf-8'),
                'content-type': "text/javascript",
                'X-SourceMap': !isMapFileRequest(pathname) ? (pathname + '.map') : null
              });

              debug('Returning loaded file', pathname);

              res.end(filedata);
              this.emit('end');
            })
        );
      });
    });

  };
};

Sear.prototype._getVersion = function () {
  var file = fs.readFileSync(process.cwd() + '/package.json');
  var pkg;
  try {
    pkg = JSON.parse(file);
  } catch(e) {
    console.log('package.json not found ' + file);
  }

  return pkg.version;
};

Sear.prototype._getReleaseVersion = function (dir) {
  var file = process.cwd() + dir + '/version';
  try {
    return fs.readFileSync(file).toString();
  } catch(e) {
    console.log('version file not found ' + file);
  }
};

Sear.prototype.getExpressApp = function (options, ready) {
  options = _.extend({assets_mount: '/assets', release_path: '/release'}, options || {}, this.options);
  var app = express();

  app.use(function (req, res, next) {
    debug('%s: %s', req.method, req.url);
    next();
  });

  if (!options.use_release) {
    app.use(options.assets_mount, this._staticAssets(options));
    app.use(this._loader(options));
    app.use(this._pushState(options));
  } else {
    var version = this._getVersion();
    var releaseVersion = this._getReleaseVersion(options.release_path);

    if (version !== releaseVersion) {
      console.log('Product version doesn\'t match the last released version');
    }

    app.use(function (req, res, next) {
      if ('GET' != req.method) return next();
      var path = url.parse(req.url).pathname;

      send(req, path)
        .maxage(options.maxAge || 0)
        .root(process.cwd() + options.release_path)
        .hidden(options.hidden)
        .on('error', function (err) {
          if (404 == err.status) return next();
          next(err);
        })
        .on('directory', function () {
          next();
        })
        .pipe(res);
    });

    app.use(function (req, res, next) {
      if ('GET' != req.method) return next();
      res.sendfile(path.join(process.cwd() + options.release_path, 'index.html'));
    });
  }

  process.nextTick(ready);

  return app;
};

module.exports = Sear;