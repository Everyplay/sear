var stringUtils = require('../stringutils');
var debug = require('debug')('sear:html');

exports.html = function (filepath, data, callback) {

  debug('processing HTML %s', filepath);

  var clean = stringUtils.escapeStringForJavascript(data.toString());
  var result = this.options.template_function
    ? ("var tmpl = require('" + this.options.template_function + "');\n")
    : "";
  result += "module.exports = '" + clean + "';\n";
  callback(null, result);
};
