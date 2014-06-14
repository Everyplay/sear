#!/usr/bin/env node

process.bin = process.title = 'sear';

var _ = require('lodash');
var cli = require('../lib/utils/cli');
var pkg = require('../package.json');
var Sear = require('../lib/sear');
var fs = require('fs');

var options;

var cliOptions = cli.readOptions({
  v: 'version',
  h: 'help'
});

try {
  options = JSON.parse(fs.readFileSync(cliOptions.config || (process.cwd() + "/sear.json")));
} catch(e) {
}

options = _.extend({}, options || {}, cliOptions);

// Handle print of version
if (options.version) {
    process.stdout.write(pkg.version + '\n');
    process.exit();
}

var sear = new Sear(options);

var command;

function cb(err) {
  if (err) {
    throw err;
  }
}

if (options.remain) {
  var parts = options.remain;
  var cmd = parts.shift();
  var args = [parts, options, cb];
  command = sear.commands[cmd] ? function () {
    sear.commands[cmd].apply(sear, args);
  } : null;
}

if (!command) {
  command = function () {
    sear.commands.help(options, cb);
  };
}

command();
