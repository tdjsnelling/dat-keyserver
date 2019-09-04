/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const rimraf = require('rimraf')
const cheerio = require('cheerio')
const assert = require('assert')
const crypto = require('crypto')
const should = chai.should()
let server

const pubKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----

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
ltn5FVFmGLTbNp3iw2pNR9jA3phXoc4=
=r3dV
-----END PGP PUBLIC KEY BLOCK-----`

const signedMessage = {
  valid: `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

I am requesting the removal of my public key from dat-keyserver. token=be354767a89dd09b4d1e739c0b9e5a4d0fd43526ce9105d63683503db47f4df9
-----BEGIN PGP SIGNATURE-----

iQEzBAEBCAAdFiEEzPgVre6I8V30V/z2RiN4G7RVLCUFAl1uxrsACgkQRiN4G7RV
LCXyvwgAn4C5YhMqBuACKlcxSVpQWz2PSsWjS0x/kGOt8jaNDBko9bUuuT4S7VsA
6LCiRU2xCAs+zv1/hnXEjiEi+wJpliwNK8b7s+ku+yzJPgHwiqhT58hMYIdVwpv+
Dz3nIlywCdtObUJuLCAE1/vW8Jnfvp0CpJXhRH8tdKPGGiNqpSsiZ+3w0kYcc9AS
8a15rHOVFk6eESjGXWofWuQRaTwob4poQVCZPbY2p/FK2iBLQYszlJn0aKftgGqg
CMIF79wNEa+uADm/WMcuIilW1jL/YuDbgpVwjnetrzNU71nR921tS8RA8zrToBQY
E9iOXSqfiFEfL40A+z3Ul+tffusNrw==
=gaQ6
-----END PGP SIGNATURE-----`,
  invalid: `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

I am requesting the removal of my public key from dat-keyserver. token=1234123412341234123412341234123412341234123412341234123412341234
-----BEGIN PGP SIGNATURE-----

iQEzBAEBCAAdFiEEzPgVre6I8V30V/z2RiN4G7RVLCUFAl1uxrsACgkQRiN4G7RV
LCXyvwgAn4C5YhMqBuACKlcxSVpQWz2PSsWjS0x/kGOt8jaNDBko9bUuuT4S7VsA
6LCiRU2xCAs+zv1/hnXEjiEi+wJpliwNK8b7s+ku+yzJPgHwiqhT58hMYIdVwpv+
Dz3nIlywCdtObUJuLCAE1/vW8Jnfvp0CpJXhRH8tdKPGGiNqpSsiZ+3w0kYcc9AS
8a15rHOVFk6eESjGXWofWuQRaTwob4poQVCZPbY2p/FK2iBLQYszlJn0aKftgGqg
CMIF79wNEa+uADm/WMcuIilW1jL/YuDbgpVwjnetrzNU71nR921tS8RA8zrToBQY
E9iOXSqfiFEfL40A+z3Ul+tffusNrw==
=gaQ6
-----END PGP SIGNATURE-----`,
  validButWrongToken: `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

I am requesting the removal of my public key from dat-keyserver. token=1234123412341234123412341234123412341234123412341234123412341234
-----BEGIN PGP SIGNATURE-----

iQEzBAEBCAAdFiEEzPgVre6I8V30V/z2RiN4G7RVLCUFAl1uy+kACgkQRiN4G7RV
LCXQKQf/f2yUkW1W9u7tAnxiFW5bDN/DzunTb51fN2Jnpnjj5IrZI5pEtq51yaq5
TPU5h757bD3mnVGuAwSDI2iTgGx/H2uBqDC+wSanf5mwaxwaxVwrOqHJPT0io5om
sFx0MzmodzdgHk5ORVMe9mw7SE5YT6v5m3P3JIXHrnneXq7vAFSOgA6KDxuHJMxc
WwXifsFBE5iUMXQv4fJoR/cs+Hl0RD3KWqstU0SI4bd5VfaZDeLKTwr/yEy4s3sD
QpexJLBmz0nuB3VzThSShRjJHKa+g6dl6o4X1cDKgQMUPzgmBPZMxPxO9MKXarep
/n+7YaqW7lg1f15h9mPokFLasWMktg==
=o0VQ
-----END PGP SIGNATURE-----`
}

const token = crypto
  .createHash('sha256')
  .update(pubKey)
  .digest('hex')

chai.use(chaiHttp)

describe('dat-keyserver', () => {
  before(done => {
    // delete test database and wait for new database to initialise before tests
    rimraf.sync('testdb')
    server = require('./index')
    setTimeout(() => {
      done()
    }, 3000)
  })

  describe('GET /', () => {
    it('should render the index page', done => {
      chai
        .request(server)
        .get('/')
        .end((err, res) => {
          res.should.have.status(200)
          done()
        })
    })

    it('should render the FAQ page', done => {
      chai
        .request(server)
        .get('/faq')
        .end((err, res) => {
          res.should.have.status(200)
          done()
        })
    })

    it('should render the key page', done => {
      chai
        .request(server)
        .get('/key')
        .end((err, res) => {
          res.should.have.status(200)
          done()
        })
    })
  })

  describe('POST /publish', () => {
    it('should publish a new public key', done => {
      chai
        .request(server)
        .post('/publish')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ key: pubKey })
        .end((err, res) => {
          res.should.have.status(200)
          res.text.should.be.eql(
            '<pre>Success! Published key ccf815adee88f15df457fcf64623781bb4552c25</pre>'
          )
          done()
        })
    })

    it('should fail to publish and invalid key', done => {
      chai
        .request(server)
        .post('/publish')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ key: 'malformed key' })
        .end((err, res) => {
          res.should.have.status(500)
          done()
        })
    })

    it('should return 400 if no key is provided', done => {
      chai
        .request(server)
        .post('/publish')
        .set('content-type', 'application/x-www-form-urlencoded')
        .end((err, res) => {
          res.should.have.status(400)
          done()
        })
    })
  })

  describe('GET /fetch', () => {
    it('should fetch a public key by key ID', done => {
      chai
        .request(server)
        .get('/fetch?fingerprint=4623781bb4552c25')
        .end((err, res) => {
          res.text.should.be.eql(`<pre>\n${pubKey}\n</pre>`)
          res.should.have.status(200)
          done()
        })
    })

    it('should fetch a public key by fingerprint', done => {
      chai
        .request(server)
        .get('/fetch?fingerprint=ccf815adee88f15df457fcf64623781bb4552c25')
        .end((err, res) => {
          res.text.should.be.eql(`<pre>\n${pubKey}\n</pre>`)
          res.should.have.status(200)
          done()
        })
    })

    it('should return 404 if no key is found', done => {
      chai
        .request(server)
        .get('/fetch?fingerprint=1234567890abcdef')
        .end((err, res) => {
          res.should.have.status(404)
          done()
        })
    })

    it('should return 400 if no fingerprint is provided', done => {
      chai
        .request(server)
        .get('/fetch')
        .end((err, res) => {
          res.should.have.status(400)
          done()
        })
    })
  })

  describe('GET /search', () => {
    it('should return a correct search result', done => {
      chai
        .request(server)
        .get('/search?query=tdjsnelling')
        .end((err, res) => {
          res.should.have.status(200)

          const $ = cheerio.load(res.text)
          assert($('.searchResults li').length, 1)
          assert.strictEqual(
            $($('.searchResults li p').get(0)).text(),
            'pub 2048/B4552C25 (cr. 2016-09-21, exp. n/a) CCF815ADEE88F15DF457FCF64623781BB4552C25'
          )

          done()
        })
    })

    it('should return a "no results" message if there are no results', done => {
      chai
        .request(server)
        .get('/search?query=this+will+return+no+results')
        .end((err, res) => {
          res.should.have.status(200)

          const $ = cheerio.load(res.text)
          assert.strictEqual($('.searchResults').length, 0)
          assert(
            res.text.includes(
              'No results for query “this will return no results”'
            )
          )

          done()
        })
    })

    it('should return 400 if no query is provided', done => {
      chai
        .request(server)
        .get('/search')
        .end((err, res) => {
          res.should.have.status(400)
          done()
        })
    })
  })

  describe('POST /remove/request', () => {
    it('should provide a correct message to be signed', done => {
      chai
        .request(server)
        .post('/remove/request')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ fingerprint: 'ccf815adee88f15df457fcf64623781bb4552c25' })
        .end((err, res) => {
          res.should.have.status(200)

          const $ = cheerio.load(res.text)
          assert.strictEqual(
            $('code').text(),
            `I am requesting the removal of my public key from dat-keyserver. token=${token}`
          )

          done()
        })
    })

    it('should return 404 if no key is found', done => {
      chai
        .request(server)
        .post('/remove/request')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ fingerprint: '1234567890abcdef' })
        .end((err, res) => {
          res.should.have.status(404)
          done()
        })
    })

    it('should return 400 if no fingerprint is provided', done => {
      chai
        .request(server)
        .post('/remove/request')
        .set('content-type', 'application/x-www-form-urlencoded')
        .end((err, res) => {
          res.should.have.status(400)
          done()
        })
    })
  })

  describe('POST /remove/verify', () => {
    it('should return 500 if signed message is malformed', done => {
      chai
        .request(server)
        .post('/remove/verify')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          fingerprint: 'ccf815adee88f15df457fcf64623781bb4552c25',
          message: 'malformed message'
        })
        .end((err, res) => {
          res.should.have.status(500)
          done()
        })
    })

    it('should return 401 if signed message is invalid', done => {
      chai
        .request(server)
        .post('/remove/verify')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          fingerprint: 'ccf815adee88f15df457fcf64623781bb4552c25',
          message: signedMessage.invalid
        })
        .end((err, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should returm 401 if signed message is valid but token incorrect', done => {
      chai
        .request(server)
        .post('/remove/verify')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          fingerprint: 'ccf815adee88f15df457fcf64623781bb4552c25',
          message: signedMessage.validButWrongToken
        })
        .end((err, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should remove a key if provided with valid message and token', done => {
      chai
        .request(server)
        .post('/remove/verify')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          fingerprint: 'ccf815adee88f15df457fcf64623781bb4552c25',
          message: signedMessage.valid
        })
        .end((err, res) => {
          res.should.have.status(200)
          done()
        })
    })
  })

  after(() => {
    // delete the test database and exit cleanly after tests are complete
    setTimeout(() => {
      rimraf.sync('testdb')
      process.exit(0)
    }, 1000)
  })
})
