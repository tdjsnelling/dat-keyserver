const app = require('express')()
const bodyParser = require('body-parser')
const path = require('path')
const openpgp = require('openpgp')
const winston = require('winston')
const hyperdb = require('hyperdb')
const hyperdiscovery = require('hyperdiscovery')
const pump = require('pump')
const args = require('minimist')(process.argv.slice(2))

const homeDir = require('os').homedir()
const appDir = path.resolve(homeDir, '.datkeyserver')

// Application logging

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dat-keyserver' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  )
}

// Distrubuted db setup

const db = hyperdb(
  path.resolve(appDir, 'keys.db'),
  'e30f46002c0128ee5255ba79596b444112ea428046064f5e596bf26b5234ceff',
  { valueEncoding: 'json' }
)

db.on('ready', () => {
  const swarm = hyperdiscovery(db)
  logger.info('database ready')

  swarm.on('connection', (peer, type) => {
    logger.info(
      `a peer at ${type.host} connected. ${swarm.connections.length} total`
    )

    const stream = db.replicate()
    pump(peer, stream, peer, (err, data) => {
      if (err) {
        logger.error(`${err}`)
      } else {
        logger.info(`${data}`)
      }
    })

    peer.on('close', () => {
      logger.info(`a peer at ${type.host} disconnected`)
    })
  })
})

// Express setup

app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'html/index.html'))
})

// HTTP route to publish a new public key

app.post('/publish', (req, res) => {
  if (req.body.key) {
    openpgp.key
      .readArmored(req.body.key)
      .then(result => {
        let entry = {}
        entry.key = req.body.key
        entry.fingerprint = result.keys[0].getFingerprint()
        entry.created = result.keys[0].getCreationTime()
        entry.userIds = result.keys[0].getUserIds()

        db.put(`/${entry.fingerprint}`, entry, err => {
          if (!err) {
            logger.info(`published key ${entry.fingerprint}`)
            res.send(`Success! Published key <pre>${entry.fingerprint}</pre>`)
          } else {
            logger.error(`${err}`)
            res.sendStatus(500)
          }
        })
      })
      .catch(err => {
        logger.error(`${err}`)
        res.sendStatus(500)
      })
  } else {
    // request must include a public key
    res.sendStatus(400)
  }
})

// HTTP route to fetch a pubilc key

app.get('/fetch', (req, res) => {
  if (req.query.fingerprint) {
    db.get(`/${req.query.fingerprint.toLowerCase()}`, (err, nodes) => {
      if (!err) {
        if (nodes[0]) {
          logger.info(`fetched key ${req.query.fingerprint.toLowerCase()}`)
          res.send(`<pre>${nodes[0].value.key}</pre>`)
        } else {
          logger.info(`peer ${req.query.fingerprint.toLowerCase()} not found`)
          res.sendStatus(404)
        }
      } else {
        logger.error(`${err}`)
        res.sendStatus(500)
      }
    })
  } else {
    res.sendStatus(400)
  }
})

// Start the HTTP server

const port = args.p || 4000
app.listen(port, () => logger.info(`dat-keyserver started on port ${port}`))
