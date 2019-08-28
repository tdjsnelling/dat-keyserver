const openpgp = require('openpgp')
const db = require('../database')
const logger = require('../helpers/logger')
const formatFingerprint = require('../helpers/formatFingerprint')

const remove = (req, res) => {
  if (req.body.fingerprint && req.body.message) {
    db.get(
      `/${formatFingerprint(req.body.fingerprint).slice(-16)}`,
      (err, nodes) => {
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
                          `/${formatFingerprint(req.body.fingerprint).slice(
                            -16
                          )}`,
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
      }
    )
  } else {
    res.sendStatus(400)
  }
}

module.exports = remove