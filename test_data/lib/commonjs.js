exports.amd = require('./amd');
exports.jquery = require('jquery');
exports.backbone = require('backbone');
exports.lessFile = require('./less.less');
exports.stylFile = require('./styl.styl');
exports.mdFile = require('./markdown.md');
exports.sassFile = require('./sass.sass');
exports.cssFile = require('./css.css');
exports.hamlFile = require('./haml.haml');
exports.htmlFile = require('./html.html');
exports.jsxFile = require('./jsx.jsx');
exports.sub = require('./dir/insubdir');
exports.foo = require('foo');
exports.a = require('foo/lib/a/a');
exports.when = require('when');
exports.indextest = require('./indextest');
exports.macro = require('./macrotest.macro');

console.log(exports.amd);
