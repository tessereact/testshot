import React from 'react'
import ReactDOM from 'react-dom'

let PropTypes
try {
  PropTypes = require('prop-types')
} catch (e) {
  // Ignore optional peer dependency
}

class PanelGroup extends React.Component {
  static defaultProps = {
    spacing: 1,
    direction: 'row',
    panelWidths: []
  }

  constructor (props, context) {
    super(props, context)
    this.state = this.loadPanels(props)
  }

  // reload panel configuration if props update
  componentWillReceiveProps (nextProps) {
    const currentPanels = this.props.panelWidths
    const nextPanels = nextProps.panelWidths

    // Only update from props if we're supplying the props in the first place
    if (nextPanels.length) {
      // if the panel array is a different size we know to update
      if (currentPanels.length !== nextPanels.length) {
        this.setState(this.loadPanels(nextProps))
      } else {
        // otherwise we need to iterate to spot any difference
        for (let i = 0; i < nextPanels.length; i++) {
          if (
            currentPanels[i].size !== nextPanels[i].size ||
            currentPanels[i].minSize !== nextPanels[i].minSize ||
            currentPanels[i].resize !== nextPanels[i].resize
          ) {
            this.setState(this.loadPanels(nextProps))
            break
          }
        }
      }
    }
  }

  // load provided props into state
  loadPanels (props) {
    const panels = []

    if (props.children) {
      // Default values if none were provided
      const defaultSize = 256
      const defaultMinSize = 48
      const defaultResize = 'stretch'

      let stretchIncluded = false
      const children = React.Children.toArray(props.children)

      for (let i = 0; i < children.length; i++) {
        if (i < props.panelWidths.length && props.panelWidths[i]) {
          const widthObj = {
            size:
              props.panelWidths[i].size != null
                ? props.panelWidths[i].size
                : defaultSize,
            minSize:
              props.panelWidths[i].minSize != null
                ? props.panelWidths[i].minSize
                : defaultMinSize,
            resize: props.panelWidths[i].resize
              ? props.panelWidths[i].resize
              : props.panelWidths[i].size ? 'dynamic' : defaultResize,
            snap:
              props.panelWidths[i].snap != null
                ? props.panelWidths[i].snap
                : []
          }
          panels.push(widthObj)
        } else {
          // default values if no props are given
          panels.push({
            size: defaultSize,
            resize: defaultResize,
            minSize: defaultMinSize,
            snap: []
          })
        }

        // if none of the panels included was stretchy, make the last one stretchy
        if (panels[i].resize === 'stretch') {
          stretchIncluded = true
        }

        if (!stretchIncluded && i === children.length - 1) {
          panels[i].resize = 'stretch'
        }
      }
    }

    return { panels }
  }

  // Pass internal state out if there's a callback for it
  // Useful for saving panel configuration
  onUpdate (panels) {
    if (this.props.onUpdate) {
      this.props.onUpdate(panels.slice())
    }
  }

  onStartResizing (panels) {
    if (this.props.onStartResizing) {
      this.props.onStartResizing()
    }
  }

  onStopResizing (panels) {
    if (this.props.onStopResizing) {
      this.props.onStopResizing()
    }
  }

  // For styling, track which direction to apply sizing to
  getSizeDirection (caps) {
    if (caps) return this.props.direction === 'column' ? 'Height' : 'Width'
    else return this.props.direction === 'column' ? 'height' : 'width'
  }

  // Render component
  render () {
    const style = {
      container: {
        width: '100%',
        height: '100%',
        ['min' + this.getSizeDirection(true)]: this.getPanelGroupMinSize(
          this.props.spacing
        ),
        display: 'flex',
        flexDirection: this.props.direction,
        flexGrow: 1
      },
      panel: {
        flexGrow: 0,
        display: 'flex'
      }
    }

    // lets build up a new children array with added resize borders
    const initialChildren = React.Children.toArray(this.props.children)
    let newChildren = []
    let stretchIncluded = false

    for (let i = 0; i < initialChildren.length; i++) {
      // setting up the style for this panel.  Should probably be handled
      // in the child component, but this was easier for now
      const panelStyle = {
        [this.getSizeDirection()]: this.state.panels[i].size,
        [this.props.direction === 'row' ? 'height' : 'width']: '100%',
        ['min' + this.getSizeDirection(true)]:
          this.state.panels[i].resize === 'stretch'
            ? 0
            : this.state.panels[i].size,

        flexGrow: this.state.panels[i].resize === 'stretch' ? 1 : 0,
        flexShrink: this.state.panels[i].resize === 'stretch' ? 1 : 0,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative'
      }

      // patch in the background color if it was supplied as a prop
      Object.assign(panelStyle, { backgroundColor: this.props.panelColor })

      // give position info to children
      const metadata = {
        isFirst: i === 0,
        isLast: i === initialChildren.length - 1,
        resize: this.state.panels[i].resize,

        // window resize handler if this panel is stretchy
        onWindowResize:
          this.state.panels[i].resize === 'stretch' ? (panelIndex, sizeObj, callback) => this.setPanelSize(panelIndex, sizeObj, callback) : null
      }

      // if none of the panels included was stretchy, make the last one stretchy
      if (this.state.panels[i].resize === 'stretch') stretchIncluded = true
      if (!stretchIncluded && metadata.isLast) metadata.resize = 'stretch'

      // push children with added metadata
      newChildren.push(
        <Panel style={panelStyle} key={'panel' + i} panelID={i} {...metadata}>
          {initialChildren[i]}
        </Panel>
      )

      // add a handle between panels
      if (i < initialChildren.length - 1) {
        newChildren.push(
          <Divider
            borderColor={this.props.borderColor}
            key={'divider' + i}
            panelID={i}
            handleResize={(i, delta) => this.handleResize(i, delta)}
            dividerWidth={this.props.spacing}
            direction={this.props.direction}
            showHandles={this.props.showHandles}
            onStartResizing={() => this.onStartResizing()}
            onStopResizing={() => this.onStopResizing()}
          />
        )
      }
    }

    return <div className='panelGroup' style={style.container}>
      {newChildren}
    </div>
  }

  // Entry point for resizing panels.
  // We clone the panel array and perform operations on it so we can
  // setState after the recursive operations are finished
  handleResize (i, delta) {
    const tempPanels = this.state.panels.slice()
    const returnDelta = this.resizePanel(
      i,
      this.props.direction === 'row' ? delta.x : delta.y,
      tempPanels
    )
    this.setState({ panels: tempPanels })
    this.onUpdate(tempPanels)
    return returnDelta
  }

  // Recursive panel resizing so we can push other panels out of the way
  // if we've exceeded the target panel's extents
  resizePanel (panelIndex, delta, panels) {
    let minsize
    let maxsize

    // track the progressive delta so we can report back how much this panel
    // actually moved after all the adjustments have been made
    let resultDelta = delta

    // make the changes and deal with the consequences later
    panels[panelIndex].size += delta
    panels[panelIndex + 1].size -= delta

    // Min and max for LEFT panel
    minsize = this.getPanelMinSize(panelIndex, panels)
    maxsize = this.getPanelMaxSize(panelIndex, panels)

    // if we made the left panel too small
    if (panels[panelIndex].size < minsize) {
      let delta = minsize - panels[panelIndex].size

      if (panelIndex === 0) {
        resultDelta = this.resizePanel(panelIndex, delta, panels)
      } else {
        resultDelta = this.resizePanel(panelIndex - 1, -delta, panels)
      }
    }

    // if we made the left panel too big
    if (maxsize !== 0 && panels[panelIndex].size > maxsize) {
      const delta = panels[panelIndex].size - maxsize

      if (panelIndex === 0) {
        resultDelta = this.resizePanel(panelIndex, -delta, panels)
      } else {
        resultDelta = this.resizePanel(panelIndex - 1, delta, panels)
      }
    }

    // Min and max for RIGHT panel
    minsize = this.getPanelMinSize(panelIndex + 1, panels)
    maxsize = this.getPanelMaxSize(panelIndex + 1, panels)

    // if we made the right panel too small
    if (panels[panelIndex + 1].size < minsize) {
      const delta = minsize - panels[panelIndex + 1].size

      if (panelIndex + 1 === panels.length - 1) {
        resultDelta = this.resizePanel(panelIndex, -delta, panels)
      } else {
        resultDelta = this.resizePanel(panelIndex + 1, delta, panels)
      }
    }

    // if we made the right panel too big
    if (maxsize !== 0 && panels[panelIndex + 1].size > maxsize) {
      const delta = panels[panelIndex + 1].size - maxsize

      if (panelIndex + 1 === panels.length - 1) {
        resultDelta = this.resizePanel(panelIndex, delta, panels)
      } else {
        resultDelta = this.resizePanel(panelIndex + 1, -delta, panels)
      }
    }

    // Iterate through left panel's snap positions
    for (let i = 0; i < panels[panelIndex].snap.length; i++) {
      if (Math.abs(panels[panelIndex].snap[i] - panels[panelIndex].size) < 20) {
        const delta = panels[panelIndex].snap[i] - panels[panelIndex].size

        if (
          delta !== 0 &&
          panels[panelIndex].size + delta >=
            this.getPanelMinSize(panelIndex, panels) &&
          panels[panelIndex + 1].size - delta >=
            this.getPanelMinSize(panelIndex + 1, panels)
        ) {
          resultDelta = this.resizePanel(panelIndex, delta, panels)
        }
      }
    }

    // Iterate through right panel's snap positions
    for (let i = 0; i < panels[panelIndex + 1].snap.length; i++) {
      if (
        Math.abs(panels[panelIndex + 1].snap[i] - panels[panelIndex + 1].size) <
        20
      ) {
        let delta = panels[panelIndex + 1].snap[i] - panels[panelIndex + 1].size

        if (
          delta !== 0 &&
          panels[panelIndex].size + delta >=
            this.getPanelMinSize(panelIndex, panels) &&
          panels[panelIndex + 1].size - delta >=
            this.getPanelMinSize(panelIndex + 1, panels)
        ) {
          resultDelta = this.resizePanel(panelIndex, -delta, panels)
        }
      }
    }

    // return how much this panel actually resized
    return resultDelta
  }

  // Utility function for getting min pixel size of panel
  getPanelMinSize (panelIndex, panels) {
    if (panels[panelIndex].resize === 'fixed') {
      if (!panels[panelIndex].fixedSize) {
        panels[panelIndex].fixedSize = panels[panelIndex].size
      }
      return panels[panelIndex].fixedSize
    }
    return panels[panelIndex].minSize
  }

  // Utility function for getting max pixel size of panel
  getPanelMaxSize (panelIndex, panels) {
    if (panels[panelIndex].resize === 'fixed') {
      if (!panels[panelIndex].fixedSize) {
        panels[panelIndex].fixedSize = panels[panelIndex].size
      }
      return panels[panelIndex].fixedSize
    }
    return 0
  }

  // Utility function for getting min pixel size of the entire panel group
  getPanelGroupMinSize (spacing) {
    let size = 0
    for (let i = 0; i < this.state.panels.length; i++) {
      size += this.getPanelMinSize(i, this.state.panels)
    }
    return size + (this.state.panels.length - 1) * spacing
  }

  // Hard-set a panel's size
  // Used to recalculate a stretchy panel when the window is resized
  setPanelSize (panelIndex, sizeObj, callback) {
    const size = this.props.direction === 'column' ? sizeObj.y : sizeObj.x

    if (size !== this.state.panels[panelIndex].size) {
      const tempPanels = this.state.panels
      tempPanels[panelIndex].size = size
      this.setState({
        panels: tempPanels
      })

      if (panelIndex > 0) {
        this.handleResize(panelIndex - 1, { x: 0, y: 0 })
      } else if (this.state.panels.length > 2) {
        this.handleResize(panelIndex + 1, { x: 0, y: 0 })
      }

      if (callback) {
        callback()
      }
    }
  }
}

if (PropTypes) {
  PanelGroup.propTypes = {
    children: PropTypes.node.isRequired,
    onStartResizing: PropTypes.func,
    onStopResizing: PropTypes.func,
    onUpdate: PropTypes.func,
    panelWidths: PropTypes.array,
    panelColor: PropTypes.string,
    borderColor: PropTypes.string,
    spacing: PropTypes.number,
    showHandles: PropTypes.bool,
    direction: PropTypes.string
  }
}

class Panel extends React.Component {
  // Find the resizeObject if it has one
  componentDidMount () {
    if (this.props.resize === 'stretch') {
      this.refs.resizeObject.addEventListener('load', () => this.onResizeObjectLoad())
      this.refs.resizeObject.data = 'about:blank'
      this.calculateStretchWidth()
    }
  }

  // Attach resize event listener to resizeObject
  onResizeObjectLoad () {
    this.refs.resizeObject.contentDocument.defaultView.addEventListener(
      'resize',
      () => this.calculateStretchWidth()
    )
  }

  // Utility function to wait for next render before executing a function
  onNextFrame (callback) {
    setTimeout(() => window.requestAnimationFrame(callback), 0)
  }

  // Recalculate the stretchy panel if it's container has been resized
  calculateStretchWidth () {
    if (this.props.onWindowResize !== null) {
      const rect = ReactDOM.findDOMNode(this).getBoundingClientRect()

      this.props.onWindowResize(
        this.props.panelID,
        { x: rect.width, y: rect.height },
        // recalcalculate again if the width is below minimum
        // Kinda hacky, but for large resizes like fullscreen/Restore
        // it can't solve it in one pass.
        () => this.onNextFrame(() => this.calculateStretchWidth())
      )
    }
  }

  // Render component
  render () {
    const style = {
      resizeObject: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: 0
      }
    }

    // only attach resize object if panel is stretchy.  Others dont need it
    const resizeObject =
      this.props.resize === 'stretch' ? (
        <object
          style={style.resizeObject}
          ref='resizeObject'
          type='text/html'
        />
      ) : null

    return <div className='panelWrapper' style={this.props.style}>
      {resizeObject}
      {this.props.children}
    </div>
  }
}

if (PropTypes) {
  Panel.propTypes = {
    children: PropTypes.node.isRequired,
    isFirst: PropTypes.bool.isRequired,
    isLast: PropTypes.bool.isRequired,
    resize: PropTypes.string.isRequired,
    onWindowResize: PropTypes.func,
    style: PropTypes.object.isRequired,
    panelID: PropTypes.number.isRequired
  }
}

class Divider extends React.Component {
  static defaultProps = {
    dividerWidth: 1,
    handleBleed: 4
  }

  constructor (props, context) {
    super(props, context)
    this.state = {
      dragging: false,
      initPos: { x: null, y: null }
    }
  }

  // Add/remove event listeners based on drag state
  componentDidUpdate (props, state) {
    if (this.state.dragging && !state.dragging) {
      this.onMouseMoveCallback = (e) => this.onMouseMove(e)
      this.onMouseUpCallback = (e) => this.onMouseUp(e)
      document.addEventListener('mousemove', this.onMouseMoveCallback)
      document.addEventListener('mouseup', this.onMouseUpCallback)
      this.props.onStartResizing()
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener('mousemove', this.onMouseMoveCallback)
      document.removeEventListener('mouseup', this.onMouseUpCallback)
      this.props.onStopResizing()
    }
  }

  // Start drag state and set initial position
  onMouseDown (e) {
    // only left mouse button
    if (e.button !== 0) return

    this.setState({
      dragging: true,
      initPos: {
        x: e.pageX,
        y: e.pageY
      }
    })

    e.stopPropagation()
    e.preventDefault()
  }

  // End drag state
  onMouseUp (e) {
    this.setState({ dragging: false })
    e.stopPropagation()
    e.preventDefault()
  }

  // Call resize handler if we're dragging
  onMouseMove (e) {
    if (!this.state.dragging) return

    let initDelta = {
      x: e.pageX - this.state.initPos.x,
      y: e.pageY - this.state.initPos.y
    }

    let flowMask = {
      x: this.props.direction === 'row' ? 1 : 0,
      y: this.props.direction === 'column' ? 1 : 0
    }

    let flowDelta = initDelta.x * flowMask.x + initDelta.y * flowMask.y

    // Resize the panels
    const resultDelta = this.handleResize(this.props.panelID, initDelta)

    // if the divider moved, reset the initPos
    if (resultDelta + flowDelta !== 0) {
      // Did we move the expected amount? (snapping will result in a larger delta)
      let expectedDelta = resultDelta === flowDelta

      this.setState({
        initPos: {
          // if we moved more than expected, add the difference to the Position
          x: e.pageX + (expectedDelta ? 0 : resultDelta * flowMask.x),
          y: e.pageY + (expectedDelta ? 0 : resultDelta * flowMask.y)
        }
      })
    }

    e.stopPropagation()
    e.preventDefault()
  }

  // Handle resizing
  handleResize (i, delta) {
    return this.props.handleResize(i, delta)
  }

  // Utility functions for handle size provided how much bleed
  // we want outside of the actual divider div
  getHandleWidth () {
    return this.props.dividerWidth + this.props.handleBleed * 2
  }
  getHandleOffset () {
    return this.props.dividerWidth / 2 - this.getHandleWidth() / 2
  }

  // Render component
  render () {
    const style = {
      divider: {
        width:
          this.props.direction === 'row' ? this.props.dividerWidth : 'auto',
        minWidth:
          this.props.direction === 'row' ? this.props.dividerWidth : 'auto',
        maxWidth:
          this.props.direction === 'row' ? this.props.dividerWidth : 'auto',
        height:
          this.props.direction === 'column' ? this.props.dividerWidth : 'auto',
        minHeight:
          this.props.direction === 'column' ? this.props.dividerWidth : 'auto',
        maxHeight:
          this.props.direction === 'column' ? this.props.dividerWidth : 'auto',
        flexGrow: 0,
        position: 'relative'
      },
      handle: {
        position: 'absolute',
        width: this.props.direction === 'row' ? this.getHandleWidth() : '100%',
        height:
          this.props.direction === 'column' ? this.getHandleWidth() : '100%',
        left: this.props.direction === 'row' ? this.getHandleOffset() : 0,
        top: this.props.direction === 'column' ? this.getHandleOffset() : 0,
        backgroundColor: this.props.showHandles
          ? 'rgba(0,128,255,0.25)'
          : 'auto',
        cursor: this.props.direction === 'row' ? 'col-resize' : 'row-resize',
        zIndex: 100
      }
    }
    Object.assign(style.divider, { backgroundColor: this.props.borderColor })

    return <div
      className='divider'
      style={style.divider}
      onMouseDown={e => this.onMouseDown(e)}
    >
      <div style={style.handle} />
    </div>
  }
}

if (PropTypes) {
  Divider.propTypes = {
    borderColor: PropTypes.string,
    panelID: PropTypes.number.isRequired,
    handleResize: PropTypes.func.isRequired,
    dividerWidth: PropTypes.number.isRequired,
    direction: PropTypes.string.isRequired,
    showHandles: PropTypes.bool,
    onStartResizing: PropTypes.func.isRequired,
    onStopResizing: PropTypes.func.isRequired,
    handleBleed: PropTypes.number
  }
}

export default PanelGroup
