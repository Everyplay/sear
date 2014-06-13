var stringUtils = require('../stringutils');
var debug = require('debug')('baker:html');

exports.html = function (base, filepath, data, callback) {

  debug('processing HTML %s %s', base, filepath);

  var clean = stringUtils.escapeStringForJavascript(data.toString());
  var result = this.options.template_function
    ? ("var tmpl = require('" + this.options.template_function + "');\n")
    : "";
  result += "module.exports = '" + clean + "';\n";
  callback(null, result);
};