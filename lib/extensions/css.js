var stringUtils = require('../stringutils');
var uglifycss = require('uglifycss');
var debug = require('debug')('sear:css');
var path = require('path');

exports.css = function (filepath, data, callback) {

  data = data.toString();

  if (this.options.minify) {
    debug('CSS uglify: %s, length: %d', filepath, data.length);
    data = uglifycss.processString(data);
    debug('CSS after uglify: %s, length: %d', filepath, data.length);
  }

  data = stringUtils.escapeStringForJavascript(data);

  var result = " var style = module.exports = document.createElement('style');\n";
  result += " style.appendChild(document.createTextNode('" + data + "'));";

  callback(null, result);
};

exports.css.updater = function (filepath, data, callback) {
  data = data.toString();

  debug('Creating css update call');

  if (this.options.minify) {
    debug('CSS uglify: %s, length: %d', filepath, data.length);
    data = uglifycss.processString(data);
    debug('CSS after uglify: %s, length: %d', filepath, data.length);
  }

  data = stringUtils.escapeStringForJavascript(data);

  var result = {
    other: [
      {
        type: 'eval', eval: "require('/" +
        path.relative(this.options.input, filepath) +
        "').innerHTML = '" + data + "';"
      }
    ]
  };

  callback(null, result);
};
