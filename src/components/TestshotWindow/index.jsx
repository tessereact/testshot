import React, {PropTypes} from 'react'
import {find} from 'lodash'
import {HtmlDiffer} from 'html-differ'
import Diff from '../../components/Diff'
import Navigation from '../../components/Navigation'
import {postJSON} from '../../lib/fetch'
import {
  buildInitialState,
  requestScenariosList,
  mergeWithPayload,
  acceptCurrentScenario,
  requestScenarioAcceptance,
  generateTreeNodes
} from './helpers'
import History from '../../lib/router/history'

// styled components
import TestshotContainer from '../../styled/TestshotContainer'
import Header from '../../styled/Header'
import TestshotContent from '../../styled/TestshotContent'
import ComponentPreview from '../../styled/ComponentPreview'
import ScenarioBlock from '../../styled/ScenarioBlock'
import ScenarioBlockContent from '../../styled/ScenarioBlockContent'
import AcceptButton from '../../styled/AcceptButton'
import Text from '../../styled/Text'

const htmlDiffer = new HtmlDiffer({
  ignoreWhitespaces: false
})

const TestshotWindow = React.createClass({
  propTypes: {
    data: PropTypes.array.isRequired,
    host: PropTypes.string.isRequired,
    port: PropTypes.string.isRequired,
    routeData: PropTypes.object
  },

  getInitialState () {
    return buildInitialState(this.props.data)
  },

  componentWillMount () {
    const url = `//${this.props.host}:${this.props.port}/snapshots-list`
    postJSON(url, requestScenariosList(this.state.scenarios)).then((response) => {
      response.json().then((json) => {
        this.setState(mergeWithPayload(this.state, json))

        // Report to CI
        const failingScenarios = this.state.scenarios
          .filter(({hasDiff}) => hasDiff)
          .map(({context, name}) => ({context, name}))

        const ws = new window.WebSocket(window.__testshotWSURL)
        ws.addEventListener('open', () => {
          if (failingScenarios.length > 0) {
            ws.send(JSON.stringify(failingScenarios))
          } else {
            ws.send('OK')
          }
        })
      })
    }, _ => {
      window.alert('Snapshot server is not available!')
    })
  },

  _areScenariosAvailable () {
    return this.state.scenarios[0].hasOwnProperty('hasDiff')
  },

  render () {
    const {
      routeData: {
        params: {
          context,
          scenario
        },
        route: {
          name: routeName
        }
      }
    } = this.props
    const {scenarios} = this.state

    if (routeName === 'home') {
      let scenario = find(scenarios, (s) => s.hasDiff) || scenarios[0]
      History.push(`/contexts/${scenario.context}/scenarios/${scenario.name}`)
    }

    return (
      <TestshotContainer>
        <Navigation
          failedScenariosCount={scenarios.filter(c => c.hasDiff).length}
          scenariosCount={scenarios.length}
          nodes={generateTreeNodes(scenarios)}
        />
        {this._areScenariosAvailable && <TestshotContent>
          {routeName === 'context' && this._renderContext(context)}
          {routeName === 'scenario' && this._renderScenario(this._findScenario(context, scenario))}
        </TestshotContent>}
      </TestshotContainer>
    )
  },

  _findScenario (contextName, scenarioName) {
    return find(this.state.scenarios, s => {
      if (contextName !== 'null') {
        return s.name === scenarioName && s.context === contextName
      } else {
        return s.name === scenarioName && !s.context
      }
    })
  },

  _renderScenario (scenario) {
    return <TestshotContent.Wrapper>
      <Header>
        <span>{scenario.name}</span>
        {scenario.hasDiff && <AcceptButton onClick={_ => this._acceptSnapshot(scenario)}>Accept & next</AcceptButton>}
      </Header>
      <ComponentPreview>
        {scenario.element}
      </ComponentPreview>
      {this._renderDiff(scenario)}
    </TestshotContent.Wrapper>
  },

  _renderContext (contextName) {
    const scenarios = this.state.scenarios.filter(s => s.context === contextName)

    return <TestshotContent.Wrapper>
      <Header>
        <span>{contextName}</span>
      </Header>
      <ComponentPreview>
        {scenarios.map(s => (<ScenarioBlock key={s.name}>
          {this._renderSectionHeader(s)}
          <ScenarioBlockContent key={s.name}>
            {s.element}
          </ScenarioBlockContent>
        </ScenarioBlock>))}
      </ComponentPreview>
    </TestshotContent.Wrapper>
  },

  _renderSectionHeader (s) {
    return s.hasDiff
      ? <Text color='#e91e63' fontSize='14px'>{s.name}</Text>
      : <Text color='#8f9297' fontSize='14px'>{s.name}</Text>
  },

  _renderContent (node) {
    if (node.isScenario) {
      return node.element
    } else {
      const scenarios = this.state.scenarios.filter(s => (s.context === node.name))
      return scenarios.map(s => (<ScenarioBlock>
        {this._renderSectionHeader(s)}
        <ScenarioBlockContent key={s.name}>
          {s.element}
        </ScenarioBlockContent>
      </ScenarioBlock>))
    }
  },

  _acceptSnapshot (scenario) {
    const {host, port} = this.props
    const url = `//${host}:${port}/snapshots`

    postJSON(url, requestScenarioAcceptance(scenario)).then(_ => {
      this.setState(acceptCurrentScenario(this.state, scenario))
      History.push('/')
    })
  },

  _renderDiff (scenario) {
    if (scenario.hasDiff) {
      return this._computeDiff(scenario)
    }
  },

  _computeDiff (scenario) {
    const {previousSnapshot, snapshot} = scenario

    if (!snapshot.length) { return null }
    const diff = htmlDiffer.diffHtml(previousSnapshot, snapshot)
    return <Diff nodes={diff} />
  }
})

export default TestshotWindow
