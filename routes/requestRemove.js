/*
  requestRemove.js

  POST route to start the process of removing a key and proving that the key
  owner is the person requesting the removal.

  We generate a message that includes a token. The token is the SHA256 hash of
  the public key that has been requested to be removed. We then render the next
  step of the removal process, which includes our message.
*/

const crypto = require('crypto')
const db = require('../database')
const pkg = require('../package.json')

const requestRemove = (req, res) => {
  if (req.body.fingerprint) {
    db.get(`/${req.body.fingerprint.slice(-16)}`, (err, nodes) => {
      if (!err) {
        if (nodes[0]) {
          const key = nodes[0].value.key
          const hash = crypto
            .createHash('sha256')
            .update(key)
            .digest('hex')
          const message = `I am requesting the removal of my public key from dat-keyserver. token=${hash}`

          res.render('remove', {
            version: pkg.version,
            fingerprint: req.body.fingerprint,
            message: message
          })
        } else {
          res.sendStatus(404)
        }
      } else {
        res.sendStatus(500)
      }
    })
  } else {
    res.sendStatus(400)
  }
}

module.exports = requestRemove
