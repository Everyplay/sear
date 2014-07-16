
(function () {
  var React;

  var mods = ['/react', '/react/react'];

  for (var i = 0; i < mods.length; i++) {
    try {
      React = require(mods[i]);
      break;
    } catch (e) {
    }
  }

  var components = {};

  function iterateComponents(comps) {
    if (!comps) {
      return;
    }

    var id, component;
    for (id in comps) {
      component = comps[id];
      var sourceFile = component.sourceFilename;
      if (sourceFile) {
        components[sourceFile] = components[sourceFile] || [];
        components[sourceFile].push(component);
      }
      iterateComponents(component._renderedComponent ?
        {
          '0.1': component._renderedComponent
        } :
        component._renderedChildren);
    }
  }

  iterateComponents(React.__internals.Mount._instancesByReactRootID);

  var componentsByFile = components['<%=module%>'.substr(1)] || [];
  var length = componentsByFile.length;

  for (i = 0; i < length; i++) {
    console.log('Rerendering ' + (
      componentsByFile[i].constructor ?
      componentsByFile[i].constructor.displayName :
      '?'
    ));
    componentsByFile[i].forceUpdate();
  }
})();
