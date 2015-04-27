var reactTools = require('react-tools');
var javascript = require('./javascript');
var debug = require('debug')('sear:jsx');
var UglifyJS = require('uglify-js');
var path = require('path');
var _ = require('lodash');


function transform(force) {
  return function (filepath, data, callback) {

    data = data.toString();
    var transform;

    try {
      transform = reactTools.transformWithDetails(data, {
        harmony: true,
        stripTypes: false,
        es5: false,
        sourceMap: true
      });
    } catch(e) {
      return callback(e);
    }

    data = transform.code;
    var sourcemap = JSON.stringify(transform.sourceMap);

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
