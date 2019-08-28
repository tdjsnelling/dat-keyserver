const db = require('../database')
const logger = require('../helpers/logger')
const formatFingerprint = require('../helpers/formatFingerprint')
const pkg = require('../package.json')

const search = (req, res) => {
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
                .includes(formatFingerprint(req.query.query)) &&
              !results.includes(list[i][0].value)
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
}

module.exports = search
