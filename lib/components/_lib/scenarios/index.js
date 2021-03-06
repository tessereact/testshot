'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sortBy2 = require('lodash/sortBy');

var _sortBy3 = _interopRequireDefault(_sortBy2);

var _chunk2 = require('lodash/chunk');

var _chunk3 = _interopRequireDefault(_chunk2);

exports.findScenario = findScenario;
exports.getChunksToLoad = getChunksToLoad;
exports.acceptScenario = acceptScenario;
exports.resolveScenario = resolveScenario;
exports.changeScenarioScreenshotData = changeScenarioScreenshotData;
exports.requestScenarioAcceptance = requestScenarioAcceptance;
exports.prepareCIReport = prepareCIReport;
exports.sortScenarios = sortScenarios;
exports.sortNodes = sortNodes;

var _formatHTML = require('../formatHTML');

var _formatHTML2 = _interopRequireDefault(_formatHTML);

var _buildScreenshotPage = require('../buildScreenshotPage');

var _buildScreenshotPage2 = _interopRequireDefault(_buildScreenshotPage);

var _diff = require('../diff');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var defaultScreenshotSizes = [{ width: 320, height: 568, alias: 'iPhone SE' }, { width: 1024, height: 768 }];

/**
 * Find a scenario by the name of the scenario and the name of its context.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @param {String} contextName
 * @param {String} scenarioName
 * @returns {ScenarioObject} wanted scenario
 */
function findScenario(scenarios, contextName, scenarioName) {
  return scenarios.find(function (s) {
    if (contextName !== 'null') {
      return s.name === scenarioName && s.context === contextName;
    } else {
      return s.name === scenarioName && !s.context;
    }
  });
}

function findScenarioIndex(scenarios, contextName, scenarioName) {
  return scenarios.findIndex(function (s) {
    if (contextName !== 'null') {
      return s.name === scenarioName && s.context === contextName;
    } else {
      return s.name === scenarioName && !s.context;
    }
  });
}

/**
 * Prepare scenario array to be sent to the server,
 * move selected scenario(s) to the start of the array if there are any,
 * split the array by chunks of the selected size.
 *
 * @param {RouteData} routeData
 * @param {Array<ScenarioObject>} scenarios
 * @param {Number} [chunkSize]
 * @returns {Array<ScenarioObject>} scenario array prepared to be sent to server
 */
function getChunksToLoad(routeData, scenarios) {
  var chunkSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Infinity;
  var _routeData$params = routeData.params,
      contextName = _routeData$params.context,
      name = _routeData$params.scenario,
      routeName = routeData.route.name;


  var context = contextName === 'null' ? null : contextName;
  if (routeName === 'scenario') {
    return shiftScenario(scenarios, context, name, chunkSize);
  } else if (routeName === 'context') {
    return shiftContext(scenarios, context, chunkSize);
  } else {
    return (0, _chunk3.default)(scenarios, chunkSize);
  }
}

function shiftScenario(scenarios, contextName, scenarioName, chunkSize) {
  var scenario = findScenario(scenarios, contextName, scenarioName);

  if (!scenario) {
    return (0, _chunk3.default)(scenarios, chunkSize);
  }

  return [[scenario]].concat(_toConsumableArray((0, _chunk3.default)(scenarios.filter(function (s) {
    return s.name !== scenarioName || s.context !== contextName;
  }), chunkSize)));
}

function shiftContext(scenarios, contextName, chunkSize) {
  return [].concat(_toConsumableArray((0, _chunk3.default)(scenarios.filter(function (s) {
    return s.context === contextName;
  }), chunkSize)), _toConsumableArray((0, _chunk3.default)(scenarios.filter(function (s) {
    return s.context !== contextName;
  }), chunkSize)));
}

/**
 * Accept the scenario in the given scenario array and return the array.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @param {ScenarioObject} acceptedScenario
 * @returns {Array<ScenarioObject>} new scenario array
 */
function acceptScenario(scenarios, acceptedScenario) {
  var scenarioIndex = findScenarioIndex(scenarios, acceptedScenario.context, acceptedScenario.name);

  var scenario = scenarios[scenarioIndex];

  return Object.assign([], scenarios, _defineProperty({}, scenarioIndex, Object.assign({}, acceptedScenario, {
    previousSnapshot: scenario.snapshot,
    snapshot: scenario.snapshot,
    hasDiff: false,
    screenshotData: null
  })));
}

/**
 * Calculate diffs for the scenario, using old snapshots received from the server.
 * Replace the scenario with the new version in the given scenario array and return the array.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @param {ScenarioObject} scenario - scenario sent by the server
 * @param {Array<ScenarioObject>} css - array of CSS snapshots
 * @returns {Array<ScenarioObject>} new scenario array
 */
function resolveScenario(scenarios, scenario, css) {
  var screenshotData = void 0;

  var name = scenario.name,
      context = scenario.context,
      oldSnapshot = scenario.snapshot,
      oldSnapshotCSS = scenario.snapshotCSS;


  var storedScenarioIndex = findScenarioIndex(scenarios, context, name);

  var storedScenario = scenarios[storedScenarioIndex];
  var options = storedScenario.options;

  var snapshot = (0, _formatHTML2.default)(storedScenario.getSnapshot());
  var snapshotCSS = options.css ? findScenario(css, context, name).snapshotCSS : null;

  var hasDiff = snapshot !== oldSnapshot || options.css && snapshotCSS !== oldSnapshotCSS;

  if (options.screenshot && hasDiff) {
    screenshotData = {
      before: (0, _buildScreenshotPage2.default)(oldSnapshot, oldSnapshotCSS),
      after: (0, _buildScreenshotPage2.default)(snapshot, snapshotCSS),
      screenshotSizes: window.__tessereactConfig && window.__tessereactConfig.screenshotSizes || defaultScreenshotSizes
    };
  }

  scenarios[storedScenarioIndex] = {
    name: name,
    context: context,
    hasDiff: hasDiff,
    snapshot: snapshot,
    snapshotCSS: snapshotCSS,
    oldSnapshot: oldSnapshot,
    oldSnapshotCSS: oldSnapshotCSS,
    status: 'resolved',
    screenshotData: screenshotData,
    options: options
  };

  return scenarios;
}

/**
 * Run callback on screenshotData of a specific scenario,
 * merge the result of the function with screenshotData
 * and return the resulting scenario array.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @param {ScenarioObject} scenario
 * @param {Function} callback
 * @returns {Array<ScenarioObject>} new scenario array
 */
function changeScenarioScreenshotData(scenarios, scenario, callback) {
  var storedScenarioIndex = findScenarioIndex(scenarios, scenario.context, scenario.name);

  var storedScenario = scenarios[storedScenarioIndex];

  return Object.assign([], scenarios, _defineProperty({}, storedScenarioIndex, Object.assign({}, storedScenario, {
    screenshotData: Object.assign({}, storedScenario.screenshotData, callback(storedScenario.screenshotData))
  })));
}

/**
 * Prepare scenario to be sent to server for acceptance:
 * return only those fields of scenario object which are required by the server.
 *
 * @param {ScenarioObject} scenario
 * @returns {ScenarioObject} scenario prepared to be sent to server
 */
function requestScenarioAcceptance(scenario) {
  var payload = {
    name: scenario.name,
    context: scenario.context,
    snapshot: scenario.snapshot,
    snapshotCSS: scenario.snapshotCSS,
    screenshotData: scenario.screenshotData
  };

  return payload;
}

/**
 * Create an object to send to the server in CI mode.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @returns {Object} CI report object
 */
function prepareCIReport(scenarios) {
  var failingScenarios = scenarios.filter(function (_ref) {
    var hasDiff = _ref.hasDiff;
    return hasDiff;
  }).map(function (scenario) {
    return {
      name: scenario.name,
      context: scenario.context,
      diff: (0, _diff.getTextDiff)(scenario)
    };
  });

  if (failingScenarios.length > 0) {
    return {
      status: 'not OK',
      scenarios: failingScenarios
    };
  } else {
    return { status: 'OK' };
  }
}

/**
 * Sort an array of scenarios.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @returns {Array<ScenarioObject>} sorted scenarios
 */
function sortScenarios(scenarios) {
  return (0, _sortBy3.default)(scenarios, ['context', 'name'], ['desc', 'desc']);
}

/**
 * Sort a tree of contexts and scenarios.
 *
 * @param {Array<ContextObject|ScenarioObject>} nodes
 * @returns {Array<ContextObject|ScenarioObject>} sorted nodes
 */
function sortNodes(nodes) {
  return (0, _sortBy3.default)(nodes, [function (node) {
    return !node.hasDiff;
  }, function (node) {
    return !node.children;
  }, 'name'], ['desc', 'desc', 'desc']);
}