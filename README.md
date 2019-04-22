# dat-keyserver

a distributed PGP keyserver project based on the dat protocol

## Installation

Make sure you have `node` and `npm` installed, and that they are fairly up-to-date.

Clone this repo, `cd` into `dat-keyserver` and `npm install` to install dependencies.

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

## Nodes

For a list of existing nodes, see [nodes.md](nodes.md). If you run a node and want to add it to the list, please submit a pull request.

## License

MIT
