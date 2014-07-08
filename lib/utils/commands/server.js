
module.exports = function (params, options, callback) {
  if (params[0]) {
    options.name = params[0];
  }

  options.port = options.port || 8080;
  options.gen_index = true;

  var app = this.getExpressApp();
  app.listen(options.port);
  console.log('Server started in port ' + options.port);
};
