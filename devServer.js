const express = require('express')
const path = require('path')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')
const httpProxy = require('http-proxy')
const webpackConfig = require('./webpack.config')

const app = express()
const apiProxy = httpProxy.createProxyServer()
const compiler = webpack(webpackConfig)
const port = process.env.PORT || 5000

app.use(express.static(path.join(process.cwd(), 'assets')))

app.use(webpackDevMiddleware(compiler, {
  noInfo: true,
  publicPath: webpackConfig.output.publicPath
}))

app.use(webpackHotMiddleware(compiler))

app.set('view engine', 'ejs')
app.set('views', path.join(process.cwd(), 'example'))

function renderIndex (req, res) {
  res.render('index')
}

app.get('/contexts/:context/scenarios/:scenario/view', renderIndex)
app.get('/contexts/:context/scenarios/:scenario', renderIndex)
app.get('/contexts/:context', renderIndex)
app.get('/fetch-css', renderIndex)
app.get('/demo', renderIndex)
app.get('/', renderIndex)

app.use("/api/*", function (req, res) {
  req.url = req.baseUrl
  apiProxy.web(req, res, {
    target: {
      port: 5001,
      host: "localhost"
    }
  })
})

app.listen(port, '0.0.0.0', err => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  console.log(`Listening at http://localhost:${port}`)
})
