/**
 * Load globals
 */
var configuration = require('./global.js');

configuration.twitter.applicationToken = "";
configuration.apns.key = "certificates/development-key.pem";
configuration.apns.cert = "certificates/development-certificate.pem";

/**
 * Export
 */
module.exports = configuration;