var fs = require('fs');
var _ = require('lodash');
var semver = require('semver');
var trueSpawn = require('child_process').spawn;

function spawn(args) {
  var pros = trueSpawn(args.shift(), args);
  return pros;
}

function increaseVersion (version, publishType) {
  if (['major', 'minor', 'patch'].indexOf(publishType) > -1) {
    return semver.inc(version, publishType);
  }

  return semver.valid(publishType) || version;
}

function pushTagToGit(tag, callback) {
  var args = ['git', 'tag', '-a', tag, '-m', 'version ' + tag];
  var git = spawn(args);
  git.on('close', function (code) {
    if (true || code === 0) {
      callback();
    } else {
      callback(new Error('Git exited with incorrect status code ' + code));
    }
  });
}

function stageChanges(file, callback) {
  var args = ['git', 'add', file];
  var git = spawn(args);
  git.on('close', function (code) {
    if (code === 0) {
      callback();
    } else {
      callback(new Error('Git exited with incorrect status code ' + code));
    }
  });
}

function commitChanges(message, callback) {
  var args = ['git', 'commit', '-m', message];
  var git = spawn(args);
  git.on('close', function (code) {
    if (code === 0) {
      callback();
    } else {
      callback(new Error('Git exited with incorrect status code ' + code));
    }
  });
}

function pushChanges(callback) {
  var args = ['git', 'push', '--follow-tags', 'origin'];
  var git = spawn(args);
  git.on('close', function (code) {
    if (code === 0) {
      callback();
    } else {
      callback(new Error('Git exited with incorrect status code ' + code));
    }
  });
}

module.exports = function (params, options, callback) {
  var publishType = params[0];

  if (!callback) {
    callback = function () {};
  }

  var pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
  } catch (e) {
    console.log('package.json not found');
    return callback(new Error('package.json not found'));
  }

  if (typeof publishType !== 'string') {
    console.log('Usage: \nbaker publish [<newversion> | major | minor | patch]');
    return callback(new Error('Invalid parameters'));
  }

  var version = pkg.version;

  var newVersion = options.version || increaseVersion(version, publishType);

  _.extend(options, {
    name: options.name || pkg.main,
    env: options.env || {
      NODE_ENV: 'production',
      version: newVersion
    },
    target: 'release',
    version: newVersion
  });

  pkg.version = newVersion;

  // Update version to package file
  fs.writeFileSync(process.cwd() + '/package.json', JSON.stringify(pkg, null, 2));

  // Build package
  this.commands.build([], options, function (err) {
    if (err) {
      return callback(err);
    }

    if (options.onlyBuild) {
      return callback();
    }

    stageChanges(process.cwd() + '/' + options.target, function (err) {
      if (err) {
        return callback(err);
      }

      stageChanges(process.cwd() + '/package.json', function (err) {
        if (err) {
          return callback(err);
        }

        commitChanges('Preparing release ' + newVersion, function (err) {
          if (err) {
            return callback(err);
          }

          pushTagToGit(newVersion, function (err) {
            if (err) {
              return callback(err);
            }
            pushChanges(function (err) {
              if (err) {
                return callback(err);
              }



                // TODO do bower and/or npm publish here also
                callback();
              });
            });

        });
      });
    });
  });
};
