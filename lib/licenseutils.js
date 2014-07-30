var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var packageFiles = [
  'package.json',
  'bower.json'
];

var potentialFilenames = [
  'LICENSE',
  'README',
  'README.md',
  'README.markdown',
  'license.txt'
];

function testFileLicense(str){
  if (str.indexOf('MIT') > -1) {
      return 'MIT';
  } else if (str.indexOf('BSD') > -1) {
      return 'BSD';
  } else if (str.indexOf('Apache License') > -1) {
      return 'Apache';
  } else if (str.indexOf('DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE') > -1) {
      return 'WTF';
  }

  return null;
}

exports.getLicenseFromPackageInfo = function (packageInfo) {
  var license = {};

  license.name = packageInfo.name;
  license.version = packageInfo.version;
  license.homepage = packageInfo.homepage || (packageInfo.repository ? packageInfo.repository.url : '');

  var licenses = [];

  if (packageInfo.license) {
    if (typeof packageInfo.license === 'string') {
      licenses = [{
        name: packageInfo.license,
        url: ''
      }];
    } else {
      licenses = [packageInfo.license];
    }
  } else if (packageInfo.licenses) {
    licenses = _.map(licenses, function (license) {
      return {
        name: license.name || '',
        url: license.url || ''
      };
    });
  }

  license.licenses = licenses;

  var authors = [];

  if (packageInfo.author) {
    if (typeof packageInfo.author === 'string') {
      authors = [{
        name: packageInfo.author,
        email: '',
        url: ''
      }];
    } else {
      authors = [packageInfo.author];
    }
  } else if (packageInfo.authors) {
    if (_.isArray(packageInfo.authors)) {
      authors = _.map(authors, function (author) {
        return {
          name: author.name || '',
          email: author.email || '',
          url: author.url || ''
        };
      });
    } else if (typeof packageInfo.authors === 'string') {
      authors = [{
        name: packageInfo.authors,
        email: '',
        url: ''
      }];
    }
  }

  license.authors = authors;

  return license;
};

exports.getLicenseFromFiles = function (dir) {
  var licenses = [];

  _.find(potentialFilenames, function (filename) {
    var fullPath = path.join(dir, filename);
    var license;
    if (fs.existsSync(fullPath) && (license = testFileLicense(fs.readFileSync(fullPath).toString()))) {
      licenses.push({
        name: license,
        url: ''
      });
      return true;
    } else {
      return false;
    }
  });


  return licenses;
};

exports.generateLicenses = function (moduleDirs) {
  if (!_.isArray(moduleDirs)) {
    moduleDirs = [moduleDirs];
  }

  var licenses = [];

  _.each(moduleDirs, function (dir) {
    if (!fs.existsSync(dir)) {
      return;
    }

    var modules = fs.readdirSync(dir);

    _.each(modules, function (moduleDir) {
      var fullModuleDir = path.join(dir, moduleDir);
      _.find(packageFiles, function (packFile) {
        var fullPath = path.join(fullModuleDir, packFile);
        if (!fs.existsSync(fullPath)) {
          return false;
        }

        var packInfo;

        try {
          packInfo = JSON.parse(fs.readFileSync(fullPath).toString());
        } catch (e) {}

        var info = exports.getLicenseFromPackageInfo(packInfo);

        if (info.licenses.length === 0) {
          info.licenses = exports.getLicenseFromFiles(fullModuleDir);
        }

        licenses.push(info);

        return true;
      });

      licenses = licenses.concat(exports.generateLicenses([
        path.join(fullModuleDir, 'node_modules'),
        path.join(fullModuleDir, 'bower_components')]
      ));
    });
  });

  var counts = {};

  licenses = _.filter(licenses, function (license) {
    counts[license.name] = counts[license.name] || 0;
    counts[license.name]++;

    if (counts[license.name] > 1) {
      return false;
    } else {
      return true;
    }
  });

  return licenses;
};
