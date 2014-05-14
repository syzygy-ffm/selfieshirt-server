/**
 * Exports
 */
module.exports = function (connect) 
{
	/**
	 * Configuration
	 */
	var configuration = require('../configuration');

	
	/**
	 * Logger
	 */
	var log4js = require('log4js');
	log4js.setGlobalLogLevel(configuration.logger.level);
	

	/**
	 * Make sure database directory exists
	 */
	var fs = require("fs");
	var mkdirp = require("mkdirp");
	var directory = require("path").dirname(configuration.database.file);
	if (!fs.existsSync(directory))
	{
		mkdirp.sync(directory);
	}


	/**
	 * Create database
	 */
	var sqlite3 = require("sqlite3").verbose();	
	var database = new sqlite3.Database(configuration.database.file);	


	/**
	 * Models
	 */
	var models = require('./model')(
	{ 
		configuration : configuration,
		database : database,
		log4js : log4js
	});
	

	/**
	 * Exports
	 */
	var exports = {};
	exports.configuration = configuration;	
	exports.log4js = log4js;
	exports.database = database;
	exports.models = models;
	
	return exports;
};