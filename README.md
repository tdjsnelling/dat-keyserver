![logotype](https://raw.githubusercontent.com/tdjsnelling/dat-keyserver/master/html/static/logotype.png)

# dat-keyserver

[![CircleCI](https://circleci.com/gh/tdjsnelling/dat-keyserver.svg?style=svg)](https://circleci.com/gh/tdjsnelling/dat-keyserver)

A distributed PGP keyserver project based on the dat protocol.

- [Introduction](#introduction)
  - [Pools](#pools)
  - [Removing keys](#removing-keys)
- [Installation](#installation)
- [Usage](#usage)
  - [Pools](#pools-1)
  - [Port](#port)
  - [Discovery](#discovery)
  - [Seeding](#seeding)
  - [Database location](#database-location)
- [Nodes](#nodes)
- [License](#license)

## Introduction

This project provides an OpenPGP keyserver that is fast, easy to set up, and fully decentralized. A key submitted to any server will be propagated to all other servers within the same pool, meaning each server stores the full set of submitted keys at all times. If a server fails or is otherwise no longer running, the keys submitted to that server are not lost and will still be available at all other servers in the pool.

#### Pools

A pool is a group of servers that share their set of data. A server operator has the choice to join an exisiting pool or create a new one. There is a 'master pool' which most servers should join, but should a company/organisation/other group of individuals want to run their own pool with a specific set of keys, then they can do so without other unwanted keys ending up on their servers.

#### Removing keys

`dat-keyserver` provides an important feature that `sks-keyserver` does not - the ability to remove keys. If a user can prove that a key belongs to them (by signing a message with their private key) then they are able to remove their public key with no interaction needed from the server operator. Once a key is removed, it is removed from all servers in the pool.

## Installation

Clone this repo and `npm install` to install dependencies (`yarn` is fine too).

## Usage

To start a new pool with no data (you probably don't want to do this) then run:

```
npm start
```

If you want to keep `dat-keyserver` running in the background, then you can use something like [PM2](http://pm2.keymetrics.io/).

#### Pools

If you want to join an existing pool then pass the `-k` option:

```
npm start -- -k [POOL_KEY]
```

If you come across a pool you wish to join but don't know the key, then you can navigate to `/key` to find it. I currently have a public pool with key `9ceccb8abeaba2868fe22d14605790b0b84ac58aba3e48606a710f4d33c5a4f7`.

#### Port

By default, `dat-keyserver` runs on port 4000. To change this, pass the `-p` option:

```
npm start -- -p 8080
```

#### Discovery

In order for your node to be able to discover others, you must have at least one of the [discovery ports](https://github.com/datproject/hyperdiscovery/blob/238c0ae274222fa1fbc536c965dac8af03fcdac3/index.js#L13) open and useable on your machine. At the time of writing, these are `3282`, `3000`, `3002`, `3004`, `2001`, `2003` & `2005`.

#### Seeding

If you would just like to run a 'seed' node, pass the `-s` option when you start the server. Your node will still hold and replicate data, and thus aid the network, but will not expose a web interface.

#### Database location

By default, `dat-keyserver` will create it's database in `~/.datkeyserver/`. If you want to change the location of the database, pass the `-d` option. For example:

```
npm start -- -d my-custom-pool/
```

Use this if you want to your node to join a new pool, but don't want to lose data from a previous pool (data from different pools cannot be stored within the same directory). The directory will be created if it does not exist.

## Nodes

For a list of existing nodes, see [nodes.md](nodes.md). If you run a node and want to add it to the list, please submit a pull request.

## License

MIT
