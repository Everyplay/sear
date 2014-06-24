/*
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var spawn = require('child_process').spawn;
var semver = require('semver');

var alts = {
  'underscore': 'lodash',
  'backbone': 'exoskeleton',
  'jquery': 'zepto'
};

function semverClean(version) {
  if (!version) {
    return;
  }
  version = version.replace(/>|=|~|\^|\ /g, '');
  if (version.match(/x$/)) {
    version = version.replace(/x/, '0');
    version = '~' + version;
  }
  return semver.clean(version);
}

function resolveNPMSubDependencies(callback) {
  var npm = spawn('npm', ['list', '--json']);
  var data = "";

  npm.stdout.on('data', function (buf) {
    data += buf.toString();
  });

  npm.stderr.pipe(process.stderr, { end: false });

  npm.on('close', function (code) {
    if (code > 0) {
      return callback(new Error("Incorrect exit code from npm list --json"));
    }

    var packageDetails = JSON.parse(data);
    callback(null, packageDetails);
  });
}

function getFlattenedDependencies(callback) {
  resolveNPMSubDependencies.call(this, function (err, packageDetails) {
    if (err) {
      return callback(err);
    }

    packageDetails.parents = [];

    // Flatten dependecies
    var flat = [];

    function iterateDeps(packageDetails) {
      if (!packageDetails.dependencies) {
        return;
      }

      _.each(packageDetails.dependencies, function (depPackageDetails, packageName) {
        depPackageDetails.name = packageName;
        depPackageDetails.parents = packageDetails.parents.concat([packageDetails.name]);

        flat.push({
          parents: depPackageDetails.parents,
          dependant: packageDetails.name,
          name: packageName,
          from: depPackageDetails.from,
          resolved: depPackageDetails.resolved,
          version: depPackageDetails.version
        });

        iterateDeps(depPackageDetails);
      });
    };

    iterateDeps(packageDetails);

    callback(null, flat);
  });
}

function addMissingDependencies(options, callback) {
  var self = this;

  options = _.extend({ignoredSubDeps: []}, options);

  var ignoredSubDeps = options.ignoredSubDeps;

  // Default ignores
  ignoredSubDeps.push('sear');
  ignoredSubDeps.push('bower');
  ignoredSubDeps.push('envify');

  var pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
  } catch (e) {
    console.log('package.json not found');
    return callback(new Error('package.json not found'));
  }

  var searConf;
  try {
    searConf = JSON.parse(fs.readFileSync(path.relative(this.options.input + '/sear.json')));
  } catch (e) {
  }

  // Add dev dependencies to ignores
  ignoredSubDeps = _.union(ignoredSubDeps, _.keys(pkg.devDependencies || {}));

  getFlattenedDependencies.call(this, function (err, flat) {
    if (err) {
      return callback(err);
    }

    flat = _.filter(flat, function (dep) {
      var keep = ignoredSubDeps.indexOf(dep.name) === -1 &&
             _.intersection(dep.parents, ignoredSubDeps).length === 0;

      if (!keep) {
        // TODO inform about ignored package
        //console.log('Ignoring ' + dep.name + ' from dependency flattening');
      }

      return keep;
    });

    // Reduce dependencies

    var depObject = {};
    _.each(flat, function (dep) {
      var depMap = depObject[dep.name] = depObject[dep.name] || {
        name: dep.name,
        versions: []
      };

      depMap.versions.push({
        version: dep.version,
        dependant: dep.dependant,
        from: dep.from,
        resolved: dep.resolved,
        parents: dep.parents
      });

      depMap.versions = depMap.versions.sort(function (aDep, bDep) {
        if (semver.gt(semverClean(aDep.version), semverClean(bDep.version))) {
          return 1;
        } else if(semver.lt(semverClean(aDep.version), semverClean(bDep.version))) {
          return -1;
        } else {
          return 0;
        }
      });
    });

    // Remove deps based on alternatives
    var packageAlternatives = _.extend({}, alts, self.options.dependency_overrides || {});

    _.each(packageAlternatives, function (replacement, original) {
      if (depObject[replacement] && depObject[original]) {
        // Removing the original from dependencies
        delete depObject[original];

        // Check that project is not already configured to handle original -> replacement conversion
        if (!searConf.dependency_overrides || !searConf.dependency_overrides[original]) {
          searConf.dependency_overrides[original] = replacement;
        }
      }
    });

    var pkgsToInstall = [];

    var pkgDeps = pkg.dependencies;
    _.each(depObject, function (dep) {

      var currentVersion = semverClean(pkgDeps[dep.name]);
      var newestVersion = dep.versions[0];
      var depVersion = semverClean(newestVersion.version);

      if (!newestVersion.from) {
        return;
      }

      if (currentVersion &&
          depVersion &&
          !semver.gt(depVersion, currentVersion)) {
        return;
      }

      var versionFrom = newestVersion.from.split('@')[1];
      if (semverClean(versionFrom)) {
        if (versionFrom.match(/x$/)) {
          versionFrom = versionFrom.replace(/x/, '0');
          versionFrom = '~' + versionFrom;
        }
        pkgDeps[dep.name] = versionFrom;
      } else {
        pkgDeps[dep.name] = newestVersion.from;
      }

      pkgsToInstall.push(newestVersion.from);
    });

    console.log(pkgsToInstall, pkg);

  });
}
*/
module.exports = function (packages, options, callback) {
  /*
  addMissingDependencies.call(this, options, function (err) {

  });
  */
};
