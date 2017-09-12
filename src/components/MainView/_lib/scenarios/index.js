/**
 * Find a scenario by the name of the scenario and the name of its context.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @param {String} contextName
 * @param {String} scenarioName
 * @returns {ScenarioObject} wanted scenario
 */
export function findScenario (scenarios, contextName, scenarioName) {
  return scenarios.find(s => {
    if (contextName !== 'null') {
      return s.name === scenarioName && s.context === contextName
    } else {
      return s.name === scenarioName && !s.context
    }
  })
}

function findScenarioIndex (scenarios, contextName, scenarioName) {
  return scenarios.findIndex(s => {
    if (contextName !== 'null') {
      return s.name === scenarioName && s.context === contextName
    } else {
      return s.name === scenarioName && !s.context
    }
  })
}

/**
 * Prepare scenario array to be sent to the server,
 * move selected scenario(s) to the start of the array if there are any.
 *
 * @param {RouteData} routeData
 * @param {Array<ScenarioObject>} scenarios
 * @returns {Array<ScenarioObject>} scenario array prepared to be sent to server
 */
export function getScenariosToLoad (routeData, scenarios) {
  const {
    params: { context: contextName, scenario: name },
    route: { name: routeName }
  } = routeData

  const context = contextName === 'null' ? null : contextName
  if (routeName === 'scenario') {
    return shiftScenario(scenarios, context, name)
  } else if (routeName === 'context') {
    return shiftContext(scenarios, context)
  } else {
    return scenarios
  }
}

function shiftScenario (scenarios, contextName, scenarioName) {
  const scenario = findScenario(scenarios, contextName, scenarioName)

  if (!scenario) {
    return scenarios
  }

  return [scenario].concat(
    scenarios.filter(s => {
      return s.name !== scenarioName || s.context !== contextName
    })
  )
}

function shiftContext (scenarios, contextName) {
  return scenarios.filter(s => {
    return s.context === contextName
  }).concat(
    scenarios.filter(s => {
      return s.context !== contextName
    })
  )
}

/**
 * Accept the scenario in the given scenario array and return the array.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @param {ScenarioObject} acceptedScenario
 * @returns {Array<ScenarioObject>} new scenario array
 */
export function acceptScenario (scenarios, acceptedScenario) {
  const scenarioIndex = findScenarioIndex(
    scenarios,
    acceptedScenario.context,
    acceptedScenario.name
  )

  const scenario = scenarios[scenarioIndex]

  return Object.assign([], scenarios, {
    [scenarioIndex]: Object.assign({}, acceptedScenario, {
      previousSnapshot: scenario.snapshot,
      snapshot: scenario.snapshot,
      hasDiff: false,
      screenshotData: null
    })
  })
}

/**
 * Replace scenario with the new version sent by the server
 * in the given scenario array and return the array.
 *
 * @param {Array<ScenarioObject>} scenarios
 * @param {ScenarioObject} scenario - scenario sent by the server
 * @returns {Array<ScenarioObject>} new scenario array
 */
export function resolveScenario (scenarios, scenario) {
  const storedScenarioIndex = findScenarioIndex(
    scenarios,
    scenario.context,
    scenario.name
  )

  const storedScenario = scenarios[storedScenarioIndex]

  return Object.assign([], scenarios, {
    [storedScenarioIndex]: {
      name: scenario.name,
      context: scenario.context,
      element: storedScenario.getElement(),
      diff: scenario.diff,
      hasDiff: scenario.diff,
      snapshot: scenario.snapshot,
      snapshotCSS: scenario.snapshotCSS,
      status: 'resolved',
      screenshotData: scenario.screenshotData
    }
  })
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
export function changeScenarioScreenshotData (scenarios, scenario, callback) {
  const storedScenarioIndex = findScenarioIndex(
    scenarios,
    scenario.context,
    scenario.name
  )

  const storedScenario = scenarios[storedScenarioIndex]

  return Object.assign([], scenarios, {
    [storedScenarioIndex]: Object.assign({}, storedScenario, {
      screenshotData: Object.assign(
        {},
        storedScenario.screenshotData,
        callback(storedScenario.screenshotData)
      )
    })
  })
}

/**
 * Prepare scenario to be sent to server for acceptance:
 * return only those fields of scenario object which are required by the server.
 *
 * @param {ScenarioObject} scenario
 * @returns {ScenarioObject} scenario prepared to be sent to server
 */
export function requestScenarioAcceptance (scenario) {
  const payload = {
    name: scenario.name,
    context: scenario.context,
    snapshot: scenario.snapshot,
    snapshotCSS: scenario.snapshotCSS,
    screenshotData: scenario.screenshotData
  }

  return payload
}