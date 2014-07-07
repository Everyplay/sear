var visitors = require('react-tools/vendor/fbtransform/visitors');
var jsTransform = require('jstransform').transform;
var reactTools = require('react-tools');
var docblock = require('jstransform/src/docblock');
var javascript = require('./javascript');
var debug = require('debug')('sear:jsx');
var UglifyJS = require('uglify-js');
var path = require('path');
var _ = require('lodash');

// React js support
function isJSXFile(data) {
  var doc = docblock.parse(data);

  var i,b;
  for (i = 0; i < doc.length; i++) {
    b = doc[i];
    if (b[0] === 'jsx') {
      return true;
    }
  }

  return false;
}

function jstransform(code, options) {
  var visitorList;
  if (options && options.harmony) {
    visitorList = visitors.getAllVisitors();
  } else {
    visitorList = visitors.transformVisitors.react;
  }
  return jsTransform(visitorList, code, {sourceMap: true});
}

function transform(force) {
  return function (filepath, data, callback) {

    data = data.toString();

    if (force) {
      debug('Processing JSX file %s', filepath);
    }

    var sourcemap;

    var isJSX;
    if ((isJSX = isJSXFile(data)) || force) {
      if (force && !isJSX) {
        debug('Adding jsx notation %s', filepath);
        data = '/** @jsx React.DOM */\n' + data;
      }

      try {
        var result = jstransform(data);
        data = result.code;
        sourcemap = result.sourceMap.toString();
      } catch (e) {
        return callback(e);
      }

      /**
      Disable for now
      var tags = _.uniq(data.match(/React\.DOM\.([^\(]+)/g));

      var varDefines = '';

      _.each(tags, function (tag) {
        var varName = tag.replace(/\./g, '_');
        varDefines =  'var ' + varName + ' = ' + tag + ';\n';
        data = data.replace(new RegExp(tag.replace(/\./g, '\\\.') + "\\\(", "g"),  varName + "(");
      });

      var lines = data.split('\n');

      var reactDefIndex;

      _.find(lines, function (item, index) {
        reactDefIndex = index;
        return item.indexOf("React = ") > -1; // TODO fix bad way to know when react is initialized
      });

      lines.splice(reactDefIndex + 1, 0, varDefines);

      data = lines.join('\n');
      **/
    }

    javascript.js.call(this, filepath, data, sourcemap, callback);
  };
}

function createWalker(filename) {
  var self = this;
  var displayName;
  return function (node) {
    if (node instanceof UglifyJS.AST_VarDef) {
      displayName = node.name.name;
    } else if (node instanceof UglifyJS.AST_Call
      && (node.expression.property === 'createClass' || node.expression.property === 'extend')
      && node.args[0] && node.args[0].properties) {
      var hasRender = false;
      var hasDisplayName = false;

      _.each(node.args[0].properties, function (prop) {
        if (prop.key === 'displayName') {
          hasDisplayName = true;
        } else if (prop.key === 'render') {
          hasRender = true;
        }
      });

      if (hasRender) {
        if (self.options.live_update) {
          /*
            React.__internals.Mount. _instancesByReactRootID['.0'].sourceFilename
          */
          debug('Adding filename  to view details' + displayName);
          node.args[0].properties.unshift(
            new UglifyJS.AST_ObjectKeyVal({key: 'sourceFilename', value: new UglifyJS.AST_String({
              value: path.relative(self.options.input, filename)
            })})
          );
        }

        if (!hasDisplayName) {
          debug('Adding display name ' + displayName);
          node.args[0].properties.unshift(
            new UglifyJS.AST_ObjectKeyVal({key: 'displayName', value: new UglifyJS.AST_String({value: displayName})})
          );
        }
      }
    }
  };
}

exports.js = transform(false);
exports.jsx = transform(true);

exports.js.createWalker = createWalker;
exports.jsx.createWalker = createWalker;
