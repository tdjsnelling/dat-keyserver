/*
  search.js

  GET route to return a list of keys based on a search query

  We have to fetch _all_ entries from the hyperdb and filter them by our search
  query. First we try and match our query to user ID strings, which include
  name, comment and email address. We also filter by key fingerprint, and only
  include matches if they are not already in our list of results.
*/

const { db } = require('../database')
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

        logger.info(
          `search for ${req.query.query} returned ${results.length} results`
        )
        res.render('search', {
          version: pkg.version,
          query: req.query.query,
          results: results
        })
      } else {
        logger.error(`${err}`)
      }
    })
  } else {
    res.sendStatus(400)
  }
}

module.exports = search
