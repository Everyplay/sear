var Baker = require('../lib/baker');

var baker = new Baker({
  input: '.',
  name: 'app',
  index: 'index.html',

  combined: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging',
  minify: process.env.NODE_ENV === 'production',
  minify_options: {
    optimize_amd: true
  },


  íncludes: [
    'requirejs',
    './includes/foobar'
  ]
});

baker.getExpressApp().listen(3334);