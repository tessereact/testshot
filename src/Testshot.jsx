import React from 'react'
import {filter, find, map, isEqual} from 'lodash'
import ReactDOMServer from 'react-dom/server'
import {HtmlDiffer} from 'html-differ'
import Formatter from './Formatter'
import {postJSON} from './Fetch'

// styled components
import TestshotContainer from './styled/TestshotContainer'
import TestshotToggle from './styled/TestshotToggle'
import Header from './styled/Header'
import Sidebar from './styled/Sidebar'
import AcceptButton from './styled/AcceptButton'
import TestshotContent from './styled/TestshotContent'
import ScenarioLink from './styled/ScenarioLink'
import FilterInput from './styled/FilterInput'

const htmlDiffer = new HtmlDiffer({})
const names = []
const data = []

// TODO: Add simulations from prev implementation
export function scenario (name, type) {
  if (names.indexOf(name) > -1) {
    throw new Error(`Scenario with name "${name}" already exists`)
  }
  names.push(name)

  data.push(() => {
    const scenarioElement = React.createElement(type, {key: name})
    return {
      name,
      element: scenarioElement,
      // TODO: Handle exception during rendering,
      // store and then display it
      snapshot: ReactDOMServer.renderToStaticMarkup(scenarioElement)
    }
  })
}

const Testshot = React.createClass({
  getInitialState () {
    const scenarios = this.props.data.map((f) => (f()))
    return {
      selectedScenario: scenarios[0] || {},
      scenarios: scenarios,
      filter: ''
    }
  },

  // TODO: Pass URL from config
  componentWillMount () {
    if (!this.props.host || !this.props.port) throw new Error('Configure "host" and "port" please.')
    const url = `//${this.props.host}:${this.props.port}/snapshots-list`
    postJSON(url, {
      data: this.state.scenarios.map((s) => ({name: s.name}))
    }).then((response) => {
      response.json().then((json) => {
        const newData = this.state.scenarios.map((s) => {
          s.previousSnapshot = find(json, {name: s.name}).previousSnapshot
          s.show = true
          return s
        })
        // TODO: Avoid setting states few times in a row
        this.setState({scenarios: newData})
        this.pickNextFailingScenario()
      })
    }, () => {
      window.alert('Snapshot server is not available!')
    })
  },

  _filterScenarios (event) {
    const newState = Object.assign({}, this.state)
    newState.filter = event.target.value
    if (event.target.value.length >= 2) {
      newState.scenarios.map(s => {
        s.show = s.name.toLowerCase().match(event.target.value)
      })
    } else {
      newState.scenarios.map(s => { s.show = true })
    }
    this.setState(newState)
  },

  render () {
    return (
      <TestshotContainer>
        <Sidebar>
          <Header>Scenarios</Header>
          <FilterInput placeholder='filter' type="text" value={this.state.filter}  onChange={this._filterScenarios}/>
          <ul>
            {map(filter(this.state.scenarios, s => s.show), (value, i) => {
              return (<li key={i}>
                <ScenarioLink
                  noDiff={this.noDiff(value)}
                  onClick={this.handleSelect.bind(this, value.name)}
                  key={value.name}
                  active={this.state.selectedScenario.name === value.name}
                >
                  {value.name}
                </ScenarioLink>
              </li>)
            })}
          </ul>
        </Sidebar>
        <TestshotContent>
          <Header>{this.state.selectedScenario.name}</Header>
          {this.state.selectedScenario.element}
          {!isEqual(this.state.selectedScenario.snapshot, this.state.selectedScenario.previousSnapshot) &&
            <AcceptButton onClick={this.acceptSnapshot.bind(this)}>Accept</AcceptButton> }
        </TestshotContent>
        <Sidebar right>
          <Header>Diff</Header>
          {this.renderDiff()}
        </Sidebar>
      </TestshotContainer>
    )
  },

  // TODO: Extract requests to a different module
  acceptSnapshot () {
    const url = `//${this.props.host}:${this.props.port}/snapshots`
    postJSON(url, {
      name: this.state.selectedScenario.name,
      snapshot: this.state.selectedScenario.snapshot
    }).then(() => {
      const newState = Object.assign({}, this.state)
      newState.selectedScenario.previousSnapshot = newState.selectedScenario.snapshot
      this.setState(newState)
      this.pickNextFailingScenario()
    })
  },

  pickNextFailingScenario () {
    const failingScenario = find(this.state.scenarios, (s) => !isEqual(s.snapshot, s.previousSnapshot))
    if (failingScenario) {
      const newState = Object.assign({}, this.state)
      newState.selectedScenario = failingScenario
      this.setState(newState)
    }
  },

  noDiff (scenario) {
    return isEqual(scenario.snapshot, scenario.previousSnapshot)
  },

  renderDiff () {
    if (this.noDiff(this.state.selectedScenario)) {
      return <p>Snapshots are identical!</p>
    } else {
      return (
        <div>
          <pre>{this.computeDiff()}</pre>
        </div>
      )
    }
  },

  computeDiff () {
    var diff = htmlDiffer.diffHtml(this.state.selectedScenario.previousSnapshot, this.state.selectedScenario.snapshot)
    return <Formatter nodes={diff} />
  },

  renderPreviousSnapshot () {
    if (this.state.selectedScenario.previousSnapshot) {
      return <div>
        <h4>Previous snapshot:</h4>
        <div><pre>{JSON.stringify(this.state.selectedScenario.previousSnapshot, null, 2) }</pre></div>
      </div>
    }
  },

  handleSelect (key) {
    this.setState({selectedScenario: find(this.state.scenarios, ['name', key])})
  }
})

const TestshotComponent = React.createClass({
  getInitialState () {
    return {
      show: window.localStorage.getItem('testing') === 'true'
    }
  },

  render () {
    return <div>
      {this.state.show && <Testshot host={this.props.server.host} port={this.props.server.port} data={data} />}
      <TestshotToggle onClick={this.toggleTestshot.bind(this)} href="#">Testshot</TestshotToggle>
    </div>
  },

  toggleTestshot () {
    window.localStorage.setItem('testing', !this.state.show)
    this.setState({show: !this.state.show})
  }
})

export default TestshotComponent
