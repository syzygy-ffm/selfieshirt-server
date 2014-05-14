/**
 * Load environment specific configuration
 */
var environment = process.env.NODE_ENV || 'development';
var configuration = require('./' + environment);

/**
 * Make pathes absolute
 */
configuration.environment = environment;
configuration.database.file = require('path').normalize(__dirname + '/../' + configuration.database.file);
configuration.apns.key = require('path').normalize(__dirname + '/../' + configuration.apns.key);
configuration.apns.cert = require('path').normalize(__dirname + '/../' + configuration.apns.cert);

/**
 * Export
 */
module.exports = configuration;