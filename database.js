/*
  database.js

  Hyperdb storage and authorization logic. If a pool key was supplied, then
  initiate our hyperdb using that key. If not, then initiate using our local
  key. When a peer connects, check if the peer is authorized and if not then
  authorize them so any changed will propogate.
*/

const hyperdb = require('hyperdb')
const hyperdiscovery = require('hyperdiscovery')
const path = require('path')
const args = require('minimist')(process.argv.slice(2))
const logger = require('./helpers/logger')

const homeDir = require('os').homedir()
let appDir = args.d ? args.d : path.resolve(homeDir, '.datkeyserver')

if (process.env.NODE_ENV === 'test') {
  appDir = 'testdb'
}

let db, swarm

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

const getSwarm = () => swarm

module.exports = { db, getSwarm }
