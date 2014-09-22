var _ = require('lodash');
var wrench = require('wrench');
var fs = require('fs');
var ncp = require('ncp').ncp;


module.exports = function (params, options, callback) {
  var self = this;

  if (!callback) {
    callback = function () {};
  }

  options.target = options.target || 'build/';

  this.build(function (err, bundle) {
    if (err) {
      if (err.code === 404) {
        console.log('Module ' + err.base + ' ' + err.path + 'could not be resolved.\n' +
        'If it is a package you might need to install it trough bower or npm.');
      }

      return callback(err);
    }

    wrench.rmdirSyncRecursive(process.cwd() + '/' + options.target, true);
    wrench.mkdirSyncRecursive(process.cwd() + '/' + options.target);

    fs.writeFileSync(process.cwd()
    + '/'
    + options.target.replace(/\/$/, '')
    + '/version', options.version);

    var index = self.getIndex(options);

    if (index) {
      fs.writeFileSync(process.cwd()
      + '/'
      + options.target.replace(/\/$/, '')
      + '/index.html', index);
    }

    (function nextModule(i) {
      var module = bundle.modules[i];
      if (!module) {
        self._getAssetDirs(function (err, dirs) {
          if (err) {
            return callback(err);
          }

          (function nextAssetDir(i) {
            var assetDir = dirs[i];
            if (!assetDir) {
              return callback(null, module);
            }

            ncp(
              assetDir.replace(/\/$/, ''),
              process.cwd() + '/' + options.target.replace(/\/$/, '') + '/assets/',
              function (err) {
                if (err) {
                  return callback(err);
                }

                nextAssetDir(++i);
            });
          })(0);
        });
        return;
      }

      fs.writeFileSync(
        process.cwd()
        + '/'
        + options.target.replace(/\/$/, '')
        + '/'
        + module.output_name.replace(/\.js$/, '')
        + '.map', JSON.stringify(module.getSourceMap()));

      var writeStream = fs.createWriteStream(
        process.cwd()
        + '/'
        + options.target.replace(/\/$/, '')
        + '/'
        + module.output_name.replace(/\.js$/, '')
        + '.js');

      var output = module.output();
      output.on('end', function () {
        nextModule(++i);
      });
      output.pipe(writeStream);
    })(0);
  });
};
