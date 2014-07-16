var should = require('chai').should();

var Sear = require('../');

describe('Sear tests', function () {
  var sear;
  before(function () {
    sear = new Sear({
      input: './test_data',
      dependency_overrides: {
        jquery: 'zepto'
      },
      bower_config_overrides: {
        react: {
          main: 'react-with-addons.js'
        }
      }
    });
  });

  it('should load commonjs file', function (next) {
    sear.loadFile('', '/app.js', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/app"') > -1).should.be.ok;
      data.base.should.equal('');
      data.relative_path.should.equal('/app.js');
      data.path.should.equal(process.cwd() + '/test_data/app.js');
      data.dependencies.length.should.equal(1);
      data.dependencies[0].path.should.equal('./lib/commonjs');
      data.dependencies[0].type.should.equal('require');
      next();
    });
  });

  it('should load commonjs file ./app.js', function (next) {
    sear.loadFile('', './app.js', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/app"') > -1).should.be.ok;
      data.base.should.equal('');
      data.relative_path.should.equal('./app.js');
      data.path.should.equal(process.cwd() + '/test_data/app.js');
      data.dependencies.length.should.equal(1);
      data.dependencies[0].path.should.equal('./lib/commonjs');
      data.dependencies[0].type.should.equal('require');
      next();
    });
  });

  it('should load commonjs file ./app', function (next) {
    sear.loadFile('', './app', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/app"') > -1).should.be.ok;
      data.base.should.equal('');
      data.relative_path.should.equal('./app');
      data.path.should.equal(process.cwd() + '/test_data/app.js');
      data.dependencies.length.should.equal(1);
      data.dependencies[0].path.should.equal('./lib/commonjs');
      data.dependencies[0].type.should.equal('require');
      next();
    });
  });

  it('should load amd file', function (next) {
    sear.loadFile('./lib', './amd.js', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/lib/amd"') > -1).should.be.ok;
      data.base.should.equal('./lib');
      data.relative_path.should.equal('./amd.js');
      data.path.should.equal(process.cwd() + '/test_data/lib/amd.js');
      data.dependencies.length.should.equal(1);
      data.dependencies[0].path.should.equal('./amdcommonjsdeb');
      data.dependencies[0].type.should.equal('define');
      next();
    });
  });

  it('should load jquery from bower components', function (next) {
    sear.loadFile('', 'jquery', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true})
        .indexOf('define("/jquery/dist/jquery"') > -1).should.be.ok;
      data.base.should.equal('');
      data.relative_path.should.equal('jquery');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/jquery/dist/jquery.js');
      data.dependencies.length.should.equal(0);
      next();
    });
  });

  it('should load jquery from bower components with base', function (next) {
    sear.loadFile('lib', 'jquery', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/jquery/dist/jquery"') > -1).should.be.ok;
      data.base.should.equal('lib');
      data.relative_path.should.equal('jquery');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/jquery/dist/jquery.js');
      data.dependencies.length.should.equal(0);
      next();
    });
  });


  it('should load foo from bower components', function (next) {
    sear.loadFile('', 'foo', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/foo/foo"') > -1).should.be.ok;
      data.base.should.equal('');
      data.relative_path.should.equal('foo');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/foo/foo.js');
      data.dependencies.length.should.equal(1);
      data.dependencies[0].path.should.equal('./bar');
      next();
    });
  });

  it('should load foo/bar from bower components', function (next) {
    sear.loadFile('', 'foo/bar', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/foo/bar"') > -1).should.be.ok;
      data.base.should.equal('');
      data.relative_path.should.equal('foo/bar');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/foo/bar.js');
      data.dependencies.length.should.equal(1);
      next();
    });
  });

  it('should load foo/bar from bower components when base foo', function (next) {
    sear.loadFile('foo', './bar', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/foo/bar"') > -1).should.be.ok;
      data.base.should.equal('foo');
      data.relative_path.should.equal('./bar');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/foo/bar.js');
      data.dependencies.length.should.equal(1);
      next();
    });
  });

  it('should resolve foo/bar ./foo -> foo', function (next) {
    sear._resolve('foo/bar', './foo', function (err, path) {
      should.not.exist(err);
      path.should.equal(process.cwd() + '/test_data/bower_components/foo/foo.js');
      next();
    });
  });

  it('should load foo from bower components when base foo/bar', function (next) {
    sear.loadFile('foo/bar', './foo', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/foo/foo"') > -1).should.be.ok;
      data.base.should.equal('foo/bar');
      data.relative_path.should.equal('./foo');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/foo/foo.js');
      data.dependencies.length.should.equal(1);
      next();
    });
  });

  it('should load bower components even when another component is the base', function (next) {
    sear.loadFile('backbone', 'underscore', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/underscore/underscore"') > -1).should.be.ok;
      data.base.should.equal('backbone');
      data.relative_path.should.equal('underscore');
      next();
    });
  });

  it('should support when bower package', function (next) {
    sear.loadFile('', 'when', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/when/when"') > -1).should.be.ok;
      data.base.should.equal('');
      data.relative_path.should.equal('when');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/when/when.js');
      data.dependencies.length.should.equal(8);
      next();
    });
  });


  it('should support when/parallel ./when', function (next) {
    sear.loadFile('when/parallel', './when', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('define("/when/when"') > -1).should.be.ok;
      data.base.should.equal('when/parallel');
      data.relative_path.should.equal('./when');
      data.path.should.equal(process.cwd() + '/test_data/bower_components/when/when.js');
      data.dependencies.length.should.equal(8);
      next();
    });
  });

  it('should have right relative paths', function (next) {
    sear.loadFile('', '/foo/lib/a/a', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('require("/foo/lib/b/b")') > -1).should.be.ok;
      next();
    });
  });

  it('should resolve paths corrently form index dep', function (next) {
    sear.loadFile('/lib/indextest', './barfoo', function (err, data) {
      should.not.exist(err);
      next();
    });
  });

  it('should resolve index file', function (next) {
    sear.loadFile('', '/lib/indextest', function (err, data) {
      should.not.exist(err);
      var src = data.ast.print_to_string({beautify: true, comments: true});
      (src.indexOf('define("/lib/indextest/index"') > -1).should.be.ok;
      (src.indexOf('require("/lib/indextest/barfoo")') > -1).should.be.ok;
      next();
    });
  });

  it('should load css', function (next) {
    sear.loadFile('./lib', './css.css', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('var style = module.exports = document.createElement') > -1).should.be.ok;
      data.base.should.equal('./lib');
      data.relative_path.should.equal('./css.css');
      data.path.should.equal(process.cwd() + '/test_data/lib/css.css');
      data.dependencies.length.should.equal(0);
      next();
    });
  });

  it('should load jsx', function (next) {
    sear.loadFile('./lib', './jsx.jsx', function (err, data) {
      should.not.exist(err);
      (data.ast.print_to_string({beautify: true, comments: true}).indexOf('React.DOM.div') > -1).should.be.ok;
      data.base.should.equal('./lib');
      data.relative_path.should.equal('./jsx.jsx');
      data.path.should.equal(process.cwd() + '/test_data/lib/jsx.jsx');
      data.dependencies.length.should.equal(1);
      next();
    });
  });

  it('should build module', function (next) {
    this.timeout(20000);
    sear.build('app', function (err, module) {
      should.not.exist(err);
      should.not.exist(module.getFile('bower_components/jquery/dist/jquery')); // Replaced with zepto
      module.getFile('bower_components/zepto/zepto').exist;
      module.getFile('bower_components/backbone/backbone').exist;
      module.getFile('bower_components/underscore/underscore').exist;
      should.not.exist(module.getFile('bower_components/react/react'));
      module.getFile('app').should.exist;
      module.getFile('lib/commonjs').exist;
      module.getFile('lib/amd').exist;
      module.getFile('lib/amdcommonjsdeb').exist;
      module.getFile('lib/css.css').exist;
      module.getFile('lib/haml.haml').exist;
      module.getFile('lib/html.html').exist;
      module.getFile('lib/jsx.jsx').exist;
      module.getFile('lib/less.less').exist;
      module.getFile('lib/markdown.md').exist;
      module.getFile('lib/sass.sass').exist;
      module.getFile('lib/styl.styl').exist;
      module.getFile('lib/dir/insubdir').exist;
      module.getFile('lib/indextest/index').exist;
      module.getFile('lib/indextest/barfoo').exist;

      next();
    });
  });

  it('should build module & minify', function (next) {
    this.timeout(20000);
    sear.build('app', function (err, module) {
      should.not.exist(err);

      module.sortByDependencies();
      module.files[0].key.should.equal('app');

      var normal = module.toString();

      module.getSourceMap().should.exist;
      // TODO more sourcemap testing;

      var minified = module.toString({minify:true});
      module.reset(); // Re-process on next toString();
      var amdOptimized = module.toString({
        minify:true,
        minify_options: {
          optimize_amd: true
        }
      });

      normal.should.exist;
      minified.should.exist;
      amdOptimized.should.exist;

      (minified.length / normal.length < 0.6).should.be.ok;
      (amdOptimized.length / minified.length < 1).should.be.ok;
      next();
    });
  });

});
