const openpgp = require('openpgp')
const db = require('../database')
const logger = require('../helpers/logger')

const publish = (req, res) => {
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
}

module.exports = publish
