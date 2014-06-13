var brucedown = require('brucedown');


exports.convertMarkdownToHTML = function (content, callback) {
  brucedown(content, callback);
};
