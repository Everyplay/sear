var htmlutils = require('../htmlutils');
var html = require('./html');
var debug = require('debug')('sear:markdown');

exports.md = function (filepath, data, callback) {
  var self = this;

  debug('Processing markdown file %s', filepath);

  htmlutils.convertMarkdownToHTML(data.toString(), function (err, htmlData) {
    if (err) {
      return callback(err);
    }

    debug('Processed markdown file %s', filepath);

    data = htmlData;

    html.html.call(self, filepath, data, callback);
  });
};
