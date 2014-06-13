var coffee = require('coffee-script');
var javascript = require('./javascript');

module.exports.coffee = function (base, filepath, data, callback) {
  try {
    var result = coffee.compile(data.toString(), {sourceMap: true});
    var sourcemap = JSON.parse(result.v3SourceMap.toString());
    javascript.js.call(this, base, filepath, result.js, JSON.stringify(sourcemap), callback);
  } catch (e) {
    callback(e);
  }
};
