var htmlutils = require('../htmlutils');
var html = require('./html');
var debug = require('debug')('baker:markdown');

exports.md = function (base, filepath, data, callback) {
  var self = this;

  debug('Processing markdown file %s %s', base, filepath);

  htmlutils.convertMarkdownToHTML(data.toString(), function (err, htmlData) {
    if (err) {
      return callback(err);
    }

    debug('Processed markdown file %s %s', base, filepath);

    data = htmlData;

    html.html.call(self, base, filepath, data, callback);
  });
};