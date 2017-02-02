import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'
import {init, scenario} from 'src/index'

console.log('--- WELCOME TO TESTSHOT DEVELOPMENT ---')

// TODO: Fix linter issues and get rid of comments
export const Service = React.createClass({
  render () {
    return (
      /* eslint-disable react/prop-types */
      <p className={this.props.selected ? 'active' : ''} onClick={this.props.onClick}>
        {this.props.name} <b>$ {this.props.price.toFixed(2)}</b>
      </p>
    )
  }
})

const Cart = React.createClass({
  getInitialState () {
    return {
      items: this.props.items,
      total: this.props.items.filter(i => i.selected).map(i => i.price).reduce((x, i) => x + i, 0)
    }
  },

  addTotal (service) {
    let items = this.state.items.slice(0)
    items.forEach((i) => {
      if (i.name === service.name) {
        i.selected = !service.selected
      }
    })
    if (!service.selected) {
      this.setState({items: items, total: this.state.total - service.price})
    } else {
      this.setState({items: items, total: this.state.total + service.price})
    }
  },

  render () {
    /* eslint-disable react/prop-types */
    const services = this.props.items.map(function (s, i) {
      return (
        <Service
          key={i}
          name={s.name}
          price={s.price}
          selected={s.selected}
          onClick={this.addTotal.bind(this, s)}
        />
      )
    }.bind(this))

    return <div>
      <h1>Our Services</h1>
      <div id='services'>
        {services}
        <p id='total'>Total <b>${this.state.total.toFixed(2)}</b></p>
      </div>
    </div>
  }
})

const App = React.createClass({
  render () {
    const services = [
      { name: 'Web Development', price: 300 },
      { name: 'Design', price: 400 },
      { name: 'Integration', price: 250 },
      { name: 'Training', price: 220 }
    ]

    return (
      <Cart items={services} />
    )
  }
})

// TODO: Move to snapshots.js file
scenario('Service: Basic', () => {
  return <Service name='UI Design' price={332} />
})

scenario('Cart: With a service', () => {
  const services = [
    { name: 'Web Development', price: 300, selected: false },
    { name: 'Design', price: 400 },
    { name: 'Integration', price: 250 },
    { name: 'New service', price: 120 }
  ]

  return <Cart items={services} />
})

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('app'))
  init()
})

if (module.hot) module.hot.accept()