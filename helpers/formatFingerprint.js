/*
  formatFingerprint.js

  Small helper function to change fingerprints into a more machine-readable
  format. Removes spaces and converts to lower case.
*/

const formatFingerprint = fingerprint =>
  fingerprint.replace(' ', '').toLowerCase()

module.exports = formatFingerprint
