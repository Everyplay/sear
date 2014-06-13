var stringUtils = require('../stringutils');
var uglifycss = require('uglifycss');
var debug = require('debug')('baker:css');

exports.css = function (base, filepath, data, callback) {

  data = data.toString();

  if (this.options.minify) {
    debug('CSS uglify: %s %s, length: %d', base, filepath, data.length);
    data = uglifycss.processString(data);
    debug('CSS after uglify: %s %s, length: %d', base, filepath, data.length);
  }

  data = stringUtils.escapeStringForJavascript(data);

  var result = " var style = module.exports = document.createElement('style');\n";
  result += " style.appendChild(document.createTextNode('" + data + "'));";

  callback(null, result);
};

exports.sync_css = function () {
  return "var style = module.exports = document.createElement('style');\n";
};
