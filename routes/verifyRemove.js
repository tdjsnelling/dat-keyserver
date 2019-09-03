/*
  verifyRemove.js

  POST route to remove a key given a fingerprint and a signed message as
  conformation

  First, we fetch the public key of the given fingerprint. Then we use it to
  verify if the signed message came from the owner of the paired private key.
  If so, then we delete the key from the hyperdb. If not, we send an
  Unauthorized response.
*/

const openpgp = require('openpgp')
const crypto = require('crypto')
const { db } = require('../database')
const logger = require('../helpers/logger')
const formatFingerprint = require('../helpers/formatFingerprint')

const remove = (req, res) => {
  if (req.body.fingerprint && req.body.message) {
    db.get(
      `/${formatFingerprint(req.body.fingerprint).slice(-16)}`,
      async (err, nodes) => {
        if (!err) {
          if (nodes[0]) {
            let message
            try {
              message = await openpgp.cleartext.readArmored(req.body.message)
            } catch (e) {
              res.sendStatus(500)
              return
            }

            const key = await openpgp.key.readArmored(nodes[0].value.key)

            const correctMessageContent = message.text.startsWith(
              'I am requesting the removal of my public key from dat-keyserver. token='
            )

            const submittedToken = message.text.slice(-64)
            const actualToken = crypto
              .createHash('sha256')
              .update(nodes[0].value.key)
              .digest('hex')

            const options = {
              message: message,
              publicKeys: key.keys
            }
            const verified = await openpgp.verify(options)
            const signatureValid = verified.signatures[0].valid

            if (
              correctMessageContent &&
              submittedToken === actualToken &&
              signatureValid
            ) {
              db.del(
                `/${formatFingerprint(req.body.fingerprint).slice(-16)}`,
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
      }
    )
  } else {
    res.sendStatus(400)
  }
}

module.exports = remove
