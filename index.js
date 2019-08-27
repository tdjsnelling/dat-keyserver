const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const path = require('path')
const openpgp = require('openpgp')
const winston = require('winston')
const hyperdb = require('hyperdb')
const hyperdiscovery = require('hyperdiscovery')
const args = require('minimist')(process.argv.slice(2))
const pkg = require('./package.json')

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
let swarm

if (args.k) {
  db = hyperdb(path.resolve(appDir, 'keys.db'), args.k, {
    valueEncoding: 'json'
  })
} else {
  db = hyperdb(path.resolve(appDir, 'keys.db'), { valueEncoding: 'json' })
}

db.on('ready', () => {
  swarm = hyperdiscovery(db)
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

// Fingerprint formatting helper

const formatFingerprint = fingerprint =>
  fingerprint.replace(' ', '').toLowerCase()

// Express setup

app.set('view engine', 'pug')
app.set('views', './html')
app.use(express.static('html/static'))
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.render('index', {
    version: pkg.version,
    key: db.key.toString('hex'),
    peers: swarm.connections.length
  })
})

app.get('/faq', (req, res) => {
  res.render('faq', { version: pkg.version })
})

// HTTP route to get pool key

app.get('/key', (req, res) => {
  res.send(`<pre>${db.key.toString('hex')}</pre>`)
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
        entry.algorithm = result.keys[0].getAlgorithmInfo()
        entry.users = []
        entry.subkeys = []

        result.keys[0].users.map(user => {
          const userObj = {
            userId: user.userId ? user.userId.userid : '[contents omitted]',
            signatures: []
          }

          user.selfCertifications.map(selfCert => {
            userObj.signatures.push({
              keyId: selfCert.issuerKeyId.toHex(),
              created: selfCert.created,
              expiry: selfCert.signatureExpirationTime
            })
          })

          user.otherCertifications.map(otherCert => {
            userObj.signatures.push({
              keyId: otherCert.issuerKeyId.toHex(),
              created: otherCert.created,
              expiry: otherCert.signatureExpirationTime
            })
          })

          entry.users.push(userObj)
        })

        result.keys[0].getSubkeys().map(subkey => {
          const subkeyObj = {
            created: subkey.getCreationTime(),
            algorithm: subkey.getAlgorithmInfo(),
            fingerprint: subkey.getFingerprint(),
            signatures: []
          }

          subkey.bindingSignatures.map(sbind => {
            subkeyObj.signatures.push({
              keyId: sbind.issuerKeyId.toHex(),
              created: sbind.created,
              expiry: sbind.signatureExpirationTime
            })
          })

          entry.subkeys.push(subkeyObj)
        })

        result.keys[0].getExpirationTime().then(expiry => {
          entry.expiry = expiry

          db.put(`/${entry.fingerprint.slice(-16)}`, entry, err => {
            if (!err) {
              logger.info(`published key ${entry.fingerprint}`)
              res.send(`<pre>Success! Published key ${entry.fingerprint}</pre>`)
            } else {
              logger.error(`${err}`)
              res.sendStatus(500)
            }
          })
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
    db.get(
      `/${formatFingerprint(req.query.fingerprint).slice(-16)}`,
      (err, nodes) => {
        if (!err) {
          if (nodes[0]) {
            logger.info(
              `fetched key ${formatFingerprint(req.query.fingerprint)}`
            )
            res.send(`<pre>\n${nodes[0].value.key}\n</pre>`)
          } else {
            logger.info(
              `key ${formatFingerprint(req.query.fingerprint)} not found`
            )
            res.sendStatus(404)
          }
        } else {
          logger.error(`${err}`)
          res.sendStatus(500)
        }
      }
    )
  } else {
    res.sendStatus(400)
  }
})

// HTTP route to search keys for a specific query

app.get('/search', (req, res) => {
  if (req.query.query) {
    let results = []

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

          if (list[i][0].value.fingerprint) {
            if (
              list[i][0].value.fingerprint
                .toLowerCase()
                .includes(req.query.query.toLowerCase())
            ) {
              results.push(list[i][0].value)
            }
          }
        }

        if (results.length) {
          logger.info(
            `search for ${req.query.query} returned ${results.length} results`
          )
          res.render('search', {
            version: pkg.version,
            query: req.query.query,
            results: results
          })
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

app.post('/remove', (req, res) => {
  if (req.body.fingerprint && req.body.message) {
    db.get(`/${formatFingerprint(req.body.fingerprint)}`, (err, nodes) => {
      if (!err) {
        if (nodes[0]) {
          openpgp.cleartext
            .readArmored(req.body.message)
            .then(message => {
              openpgp.key
                .readArmored(nodes[0].value.key)
                .then(key => {
                  const options = {
                    message: message,
                    publicKeys: key.keys
                  }

                  openpgp.verify(options).then(verified => {
                    const valid = verified.signatures[0].valid
                    if (valid) {
                      db.del(
                        `/${formatFingerprint(req.body.fingerprint)}`,
                        err => {
                          if (!err) {
                            logger.info(
                              `key ${formatFingerprint(
                                req.body.fingerprint
                              )} was removed successfully`
                            )
                            res.send(
                              `<pre>Key ${formatFingerprint(
                                req.body.fingerprint
                              )} was removed successfully`
                            )
                          } else {
                            logger.error(
                              `there was an error removing key ${formatFingerprint(
                                req.body.fingerprint
                              )}`
                            )
                            res.sendStatus(500)
                          }
                        }
                      )
                    } else {
                      logger.error(
                        `user was not authorised to remove key ${formatFingerprint(
                          req.body.fingerprint
                        )}`
                      )
                      res.sendStatus(401)
                    }
                  })
                })
                .catch(err => {
                  logger.error(`${err}`)
                  res.sendStatus(500)
                })
            })
            .catch(err => {
              logger.error(`${err}`)
              res.sendStatus(500)
            })
        } else {
          logger.info(
            `key ${formatFingerprint(req.body.fingerprint)} not found`
          )
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
