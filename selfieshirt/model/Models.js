
/**
 * Dependencies.
 */
var Queries = require('./Queries.js');
var Devices = require('./Devices.js');
var Twitter = require('./Twitter.js');
var TweetImages = require('./TweetImages.js');


/**
 * Models holds a singleton instance of all models needed
 * for the app.
 *
 * @api public
 */
function Models(context) 
{
	context = context || {};
	var configuration = 
	{
		configuration : context.configuration || {},
		database : context.database || null,
		models : this,
		log4js : context.log4js,
		applicationToken : context.configuration.twitter.applicationToken
	};
	this.devices = new Devices(configuration);
	this.queries = new Queries(configuration);	
	this.twitter = new Twitter(configuration);	
	this.tweetImages = new TweetImages(configuration);		
};



/**
 * Export
 */
module.exports = Models;