const app = require('express')()
const bodyParser = require('body-parser')
const path = require('path')
const openpgp = require('openpgp')
const winston = require('winston')
const hyperdb = require('hyperdb')
const hyperdiscovery = require('hyperdiscovery')

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
  { valueEncoding: 'utf8' }
)
db.on('ready', () => {
  const swarm = hyperdiscovery(db)
  logger.info('database ready')

  swarm.on('connection', (peer, type) => {
    logger.info(`peer connected: ${swarm.connections.length} total`)
  })
})

// Express setup

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendStatus(200)
})

// HTTP route to publish a new public key

app.post('/api/publish', (req, res) => {
  if (req.body.key) {
    openpgp.key
      .readArmored(req.body.key)
      .then(result => {
        let entry = {}
        entry.key = req.body.key
        entry.fingerprint = result.keys[0].getFingerprint()
        entry.created = result.keys[0].getCreationTime()
        entry.userIds = result.keys[0].getUserIds()

        db.put(`/${entry.fingerprint}`, JSON.stringify(entry), err => {
          if (!err) {
            logger.info(`published key ${entry.fingerprint}`)
            res.send(entry.fingerprint)
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

app.get('/api/fetch/:fingerprint', (req, res) => {
  db.get(`/${req.params.fingerprint}`, (err, nodes) => {
    if (!err) {
      if (nodes[0]) {
        logger.info(`fetched key ${req.params.fingerprint}`)
        res.send(JSON.parse(nodes[0].value).key)
      } else {
        res.sendStatus(404)
      }
    } else {
      logger.error(`${err}`)
      res.sendStatus(500)
    }
  })
})

// Start the HTTP server

app.listen(12844, () => logger.info('dat-keyserver started on port 12844'))
