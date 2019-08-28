/*
  index.js

  Entry point for the project. Here we set up our Express routes and expose
  a port for the server to run on.
*/

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const args = require('minimist')(process.argv.slice(2))
const pkg = require('./package.json')
const logger = require('./helpers/logger')
const db = require('./database')

const publish = require('./routes/publish')
const fetch = require('./routes/fetch')
const search = require('./routes/search')
const remove = require('./routes/remove')

// Express setup
app.set('view engine', 'pug')
app.set('views', './html')
app.use(express.static('html/static'))
app.use(bodyParser.urlencoded({ extended: true }))

// Render index page
app.get('/', (req, res) => {
  res.render('index', {
    version: pkg.version,
    key: db.key.toString('hex')
  })
})

// Render FAQ page
app.get('/faq', (req, res) => {
  res.render('faq', { version: pkg.version })
})

// HTTP route to get pool key
app.get('/key', (req, res) => {
  res.send(`<pre>${db.key.toString('hex')}</pre>`)
})

// HTTP route to publish a new public key
app.post('/publish', publish)

// HTTP route to fetch a pubilc key
app.get('/fetch', fetch)

// HTTP route to search keys for a specific query
app.get('/search', search)

// HTTP route to remove a key
app.post('/remove', remove)

// Start the HTTP server
const port = args.p || 4000
app.listen(port, () => logger.info(`dat-keyserver started on port ${port}`))
