/*
  publish.js

  POST route to publish a new public key.

  Here we recieve the public key, parse out all of the useful information,
  and store it in the hyperdb.
*/

const openpgp = require('openpgp')
const { db } = require('../database')
const logger = require('../helpers/logger')

const publish = async (req, res) => {
  if (req.body.key) {
    const result = await openpgp.key.readArmored(req.body.key)

    let entry = {}
    entry.key = req.body.key
    entry.fingerprint = result.keys[0].getFingerprint()
    entry.created = result.keys[0].getCreationTime()
    entry.userIds = result.keys[0].getUserIds()
    entry.algorithm = result.keys[0].getAlgorithmInfo()
    entry.expiry = await result.keys[0].getExpirationTime()
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

    db.put(`/${entry.fingerprint.slice(-16)}`, entry, err => {
      if (!err) {
        logger.info(`published key ${entry.fingerprint}`)
        res.send(`<pre>Success! Published key ${entry.fingerprint}</pre>`)
      } else {
        logger.error(`${err}`)
        res.sendStatus(500)
      }
    })
  } else {
    // request body didn't include a public key
    res.sendStatus(400)
  }
}

module.exports = publish
