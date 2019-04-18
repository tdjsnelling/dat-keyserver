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
npm start -k [POOL_KEY]
```

If you come across a pool you wish to join but don't know the key, then you can navigate to `/key` to find it.

#### Port

By default, `dat-keyserver` runs on port 4000. To change this, pass the `-p` option:

```
npm start -p 8080
```

## License

MIT
