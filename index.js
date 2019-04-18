const app = require('express')()
const bodyParser = require('body-parser')
const path = require('path')
const openpgp = require('openpgp')
const winston = require('winston')
const hyperdb = require('hyperdb')
const hyperdiscovery = require('hyperdiscovery')
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

let db
if (args.k) {
  db = hyperdb(path.resolve(appDir, 'keys.db'), args.k, {
    valueEncoding: 'json'
  })
} else {
  db = hyperdb(path.resolve(appDir, 'keys.db'), { valueEncoding: 'json' })
}

db.on('ready', () => {
  const swarm = hyperdiscovery(db)
  logger.info(`database ${db.key.toString('hex')} ready`)

  if (!args.k) {
    logger.info(`your pool key is ${db.key.toString('hex')}`)
  }

  db.put('/t', { t: new Date().getTime() })

  swarm.on('connection', (peer, type) => {
    logger.info(
      `a peer at ${type.host} connected. ${swarm.connections.length} total`
    )

    db.authorized(peer.remoteUserData, (err, auth) => {
      if (err) {
        logger.error(`${err}`)
      } else {
        if (!auth) {
          db.authorize(peer.remoteUserData, err => {
            if (!err) {
              logger.info(`peer at ${type.host} was authorised`)
            }
          })
        }
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
          logger.info(`key ${req.query.fingerprint.toLowerCase()} not found`)
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

// HTTP route to search keys for a specific query

const generateUserIdsList = userIds => {
  let html = '<ul>'
  for (let i in userIds) {
    html += `<li>${userIds[i].replace('<', '&lt;').replace('>', '&gt;')}</li>`
  }
  return (html += '</ul>')
}

const generateSearchResultHtml = item => {
  return `<li style="padding-bottom:30px;">
      <p>pub <a href="/fetch?fingerprint=${
        item.fingerprint
      }">${item.fingerprint.toUpperCase().replace(/(.{4})/g, '$1 ')}</a></p>
      <p>Created ${item.created.split('T')[0]}</p>
      ${generateUserIdsList(item.userIds)}
    </li>`
}

app.get('/search', (req, res) => {
  if (req.query.query) {
    let results = []
    let htmlResults = []

    db.list('/', (err, list) => {
      if (!err) {
        for (let i in list) {
          const userIds = list[i][0].value.userIds

          for (let j in userIds) {
            if (
              userIds[j].toLowerCase().includes(req.query.query.toLowerCase())
            ) {
              if (!results.includes(list[i][0].value)) {
                results.push(list[i][0].value)
              }
            }
          }
        }

        if (results.length) {
          logger.info(
            `search for ${req.query.query} returned ${results.length} results`
          )
          for (let i in results) {
            htmlResults.push(generateSearchResultHtml(results[i]))
          }
          res.send(
            `<h1>Search results for “${
              req.query.query
            }”</h1><ul style="padding:0;font-family:monospace;">${htmlResults.join(
              ''
            )}</ul>`
          )
        } else {
          res.sendStatus(404)
        }
      } else {
        logger.error(`${err}`)
      }
    })
  } else {
    res.sendStatus(400)
  }
})

// Start the HTTP server

const port = args.p || 4000
app.listen(port, () => logger.info(`dat-keyserver started on port ${port}`))
