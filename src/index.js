// Main entry point, exposes the public API

import React from 'react'
import ReactDOM from 'react-dom'
import ReactDOMServer from 'react-dom/server'
import WelcomeView from './components/WelcomeView'
import MainView from './components/MainView'
import ScenarioView from './components/ScenarioView'
import FetchCSSView from './components/FetchCSSView'
import routes from './routes'

let PropTypes
try {
  PropTypes = require('prop-types')
} catch (e) {
  // Ignore optional peer dependency
}

const names = []
const data = []
let currentContext = null

/**
 * Create a scenario.
 * @param {String} name - name of the scenario
 * @param {React.Component} type - component to create a scenario from
 * @param {Object} [options]
 * @param {Boolean} [options.css] - enable CSS diff
 * @param {Boolean} [options.screenshot] - enable CSS and screenshot diff.
 *   When true, ignore the value of `options.css`
 */
export function scenario (name, type, {css, screenshot} = {}) {
  const contextCopy = currentContext
  if (names.some(([existingName, existingContext]) =>
    name === existingName && currentContext === existingContext
  )) {
    throw new Error(`Scenario with name "${name}" already exists`)
  }
  names.push([name, currentContext])

  data.push({
    name,
    getElement: () => React.createElement(type, {key: name}),
    // TODO: Handle exception during rendering,
    // store and then display it
    getSnapshot: () => ReactDOMServer.renderToStaticMarkup(React.createElement(type, {key: name})),
    context: contextCopy,
    options: {
      css: css || screenshot,
      screenshot
    }
  })
}

/**
 * Recieves the name of context and a function.
 * Any scenarios created inside the function would have that context.
 * @param {String} contextName
 * @param {Function} func
 */
export function context (contextName, func) {
  currentContext = contextName
  func()
  currentContext = null
}

/**
 * UI of Tessereact.
 * @extends React.Component
 * @property {String} props.host - host of the Tessereact server
 * @property {String} props.port - port of the Tessereact server
 * @property {RouteData} props.routeData
 */
export class UI extends React.Component {
  render () {
    if (!data.length) {
      return React.createElement(WelcomeView)
    }

    if (this.props.routeData.route.name === 'view') {
      return React.createElement(ScenarioView, {
        data,
        routeData: this.props.routeData
      })
    }

    if (this.props.routeData.route.name === 'fetchCSS') {
      return React.createElement(FetchCSSView, { data })
    }

    return React.createElement(MainView, {
      data,
      routeData: this.props.routeData
    })
  }
}

if (PropTypes) {
  UI.propTypes = {
    routeData: PropTypes.object.isRequired
  }
}

/**
 * Run Tessereact UI.
 * @param {Object} [options]
 * @param {String} [options.className] - CSS class of Tessereact UI wrapper elemtn
 */
export function init (options = {}) {
  const wrapperElement = document.createElement('div')

  if (options.className) {
    wrapperElement.classList.add(options.className)
  }
  document.body.appendChild(wrapperElement)

  routes.start((routeData) => {
    ReactDOM.render(
      React.createElement(UI, Object.assign({}, options, {routeData})),
      wrapperElement
    )
  })
}
