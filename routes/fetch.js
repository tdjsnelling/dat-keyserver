/*
  fetch.js

  GET route to return then public key of given fingerprint

  Lookup a fingerprint in our hyperdb and return the associated public key. If
  not then return a Not Found response.
*/

const { db } = require('../database')
const logger = require('../helpers/logger')
const formatFingerprint = require('../helpers/formatFingerprint')

const fetch = (req, res) => {
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
}

module.exports = fetch
