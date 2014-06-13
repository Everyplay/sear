
/**
 * Escape string so it can be inlined in javascript
 * @param {String} input to be escaped
 * @return {String} escaped string
 */
function escapeStringForJavascript(content) {
  return content.replace(/(['\\])/g, '\\$1')
    .replace(/[\f]/g, "\\f")
    .replace(/[\b]/g, "\\b")
    .replace(/[\n]/g, "\\n")
    .replace(/[\t]/g, "\\t")
    .replace(/[\r]/g, "\\r")
    .replace(/[\u2028]/g, "\\u2028")
    .replace(/[\u2029]/g, "\\u2029");
}

exports.escapeStringForJavascript = escapeStringForJavascript;
