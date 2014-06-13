var debug = require('debug')('baker:js');
var envify = require('envify');
var createVisitors = require('envify/visitors');
var processEnvPattern = /\bprocess\.env\b/;
var jstransform = require('jstransform');
var _ = require('lodash');

exports.js = function (base, filepath, data, sourcemap, callback) {
  if (arguments.length === 4) {
    callback = sourcemap;
    sourcemap = null;
  }

  data = data.toString();

  if (processEnvPattern.test(data)) {
    debug('Envifying JS %s %s', base, filepath);
    var env = process.env || {};
    env = _.extend({NODE_ENV: 'development'}, env, this.options.env || {});
    data = jstransform.transform(createVisitors(env), data).code;
  } else {
    debug('Doing nothing for JS %s %s', base, filepath);
  }

  callback(null, data, sourcemap);
};
