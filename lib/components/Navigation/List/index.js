'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _Context = require('../Context');

var _Context2 = _interopRequireDefault(_Context);

var _Scenario = require('../Scenario');

var _Scenario2 = _interopRequireDefault(_Scenario);

var _List = require('../../../styled/List');

var _List2 = _interopRequireDefault(_List);

var _scenarios = require('../../_lib/scenarios');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PropTypes = void 0;
try {
  PropTypes = require('prop-types');
} catch (e) {}
// Ignore optional peer dependency


/**
 * Component which represents the nodes tree in sidebar.
 * @extends React.Component
 * @property {Array<ContextObject|ScenarioObject>} props.nodes - tree of contexts and scenarios
 * @property {Object} props.selectedRoute - name of selected route, and if available, selected scenario and context
 * @property {String} [props.searchQuery]
 * @property {Boolean} [props.child] - is the tree a subtree
 */

var List = function (_React$Component) {
  _inherits(List, _React$Component);

  function List() {
    _classCallCheck(this, List);

    return _possibleConstructorReturn(this, (List.__proto__ || Object.getPrototypeOf(List)).apply(this, arguments));
  }

  _createClass(List, [{
    key: '_renderItem',
    value: function _renderItem(node) {
      return node.children ? this._renderContext(node) : this._renderScenario(node);
    }
  }, {
    key: '_renderContext',
    value: function _renderContext(node) {
      var _props = this.props,
          searchQuery = _props.searchQuery,
          selectedRoute = _props.selectedRoute;


      return _react2.default.createElement(_Context2.default, {
        key: node.name,
        node: node,
        searchQuery: searchQuery,
        selectedRoute: selectedRoute
      });
    }
  }, {
    key: '_renderScenario',
    value: function _renderScenario(node) {
      var _props2 = this.props,
          searchQuery = _props2.searchQuery,
          child = _props2.child,
          selectedRoute = _props2.selectedRoute;


      return _react2.default.createElement(_Scenario2.default, {
        key: [node.context, node.name].join(' - '),
        node: node,
        searchQuery: searchQuery,
        child: child,
        selectedRoute: selectedRoute
      });
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        _List2.default,
        null,
        (0, _scenarios.sortNodes)(this.props.nodes).map(this._renderItem, this)
      );
    }
  }]);

  return List;
}(_react2.default.Component);

if (PropTypes) {
  List.propTypes = {
    nodes: PropTypes.array.isRequired,
    child: PropTypes.bool,
    selectedRoute: PropTypes.object.isRequired,
    searchQuery: PropTypes.string
  };
}

exports.default = List;