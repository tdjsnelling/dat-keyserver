const app = require('express')()
const bodyParser = require('body-parser')
const openpgp = require('openpgp')
const winston = require('winston')

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

// Express setup

app.use(bodyParser.json())

// HTTP route to publish a new public key

app.post('/publish', (req, res) => {
  if (req.body.key) {
    openpgp.key
      .readArmored(req.body.key)
      .then(result => {
        let entry = {}
        entry.fingerprint = result.keys[0].getFingerprint()
        entry.created = result.keys[0].getCreationTime()
        entry.userIds = result.keys[0].getUserIds()
        res.send(entry)
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

// Start the HTTP server

app.listen(12844, () => logger.info('dat-keyserver started on port 12844'))
