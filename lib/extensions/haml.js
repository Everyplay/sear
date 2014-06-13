var Haml = require('haml');
var stringUtils = require('../stringutils');
var debug = require('debug')('baker:haml');

exports.haml = function (base, filepath, data, callback) {

  var h = new Haml("", {customEscape: 'html_escape'});

  debug('Compiling HAML template %s %s', base, filepath);

  var template = Haml.compile(data.toString());
  var clean = stringUtils.escapeStringForJavascript(template);

  var result = "module.exports = new Function('locals', 'with (locals || {}) { return " + clean + "; }');\n";

  debug('Compiled HAML template %s %s', base, filepath);

  callback(null, result);
};