
(function () {
  var React = require('/react');

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
  var i = 0;
  var length = componentsByFile.length;

  for (; i < length; i++) {
    console.log('Rerendering ' + (
      componentsByFile[i].constructor ?
      componentsByFile[i].constructor.displayName :
      '?'
    ));
    componentsByFile[i].forceUpdate();
  }
})();
