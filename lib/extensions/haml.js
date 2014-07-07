var Haml = require('haml');
var stringUtils = require('../stringutils');
var debug = require('debug')('sear:haml');

exports.haml = function (filepath, data, callback) {

  var h = new Haml("", {customEscape: 'html_escape'});

  debug('Compiling HAML template %s', filepath);

  var template = Haml.compile(data.toString());
  var clean = stringUtils.escapeStringForJavascript(template);

  var result = "module.exports = new Function('locals', 'with (locals || {}) { return " + clean + "; }');\n";

  debug('Compiled HAML template %s', filepath);

  callback(null, result);
};
