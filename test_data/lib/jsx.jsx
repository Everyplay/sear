/** @jsx React.DOM */

var React = require('react');

var HelloMessage = React.createClass({
  render: function() {
    return <div>Hello {this.props.name}{this.props.name}{this.props.name}{this.props.name}{this.props.name}</div>;
  }
});

React.renderComponent(<HelloMessage name="John" />, document.body);


function thisWOntBeRan() {
    var HelloMessage = FoobarView.extend({
      render: function() {
        return <div>Hello {this.props.name}{this.props.name}{this.props.name}{this.props.name}{this.props.name}</div>;
      }
    });
}