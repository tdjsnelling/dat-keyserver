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
const { db, getSwarm } = require('./database')

const publish = require('./routes/publish')
const fetch = require('./routes/fetch')
const search = require('./routes/search')
const requestRemove = require('./routes/requestRemove')
const verifyRemove = require('./routes/verifyRemove')

if (args.h) {
  // eslint-disable-next-line
  console.log(
    `dat-keyserver: a distributed PGP keyserver project based on the dat protocol

Options:
  -k <key>  : the key of the pool you want to join
  -p <port> : the port to run the HTTP server on (4000)
  -s        : run in seeding mode (false)
  -d <path> : path to the folder in which you want to store the database (~/.datkeyserver)

See README.md for more information.`
  )
  process.exit(0)
}

// Express setup
app.set('view engine', 'pug')
app.set('views', './html')
app.use(express.static('html/static'))
app.use(bodyParser.urlencoded({ extended: true }))

// Render index page
app.get('/', (req, res) => {
  res.render('index', {
    version: pkg.version,
    key: db.key.toString('hex'),
    peers: getSwarm().connections.length
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

// HTTP route to request removal of a key
app.post('/remove/request', requestRemove)

// HTTP route to verify the removal of a key
app.post('/remove/verify', verifyRemove)

if (!args.s) {
  // Start the HTTP server
  const port = args.p || 4000
  app.listen(port, () => logger.info(`dat-keyserver started on port ${port}`))
}

module.exports = app
