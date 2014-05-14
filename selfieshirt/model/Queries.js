/**
 * Dependencies.
 */
var async = require('async');
var querystring = require('querystring');
var http = require('https');
var fs = require('fs');


/**
 * Manages all interactions with twitter queries :
 *  - updating query details
 *  - get all queries
 *  - get queries for devices
 *
 * @api public
 * @param object configuration
 */
function Queries(configuration) 
{
	//Configure
	configuration = configuration || {};
	this.database = configuration.database || null;	
	this.logger = (configuration.log4js) ? configuration.log4js.getLogger(configuration.logger || 'selfieshirt.model.Queries') : null;
	this.models = configuration.models || null;
	this.configuration = configuration.configuration || {};
	this.bearerToken = false;

	// Make sure database tables exist
	var scope = this;
	this.database.serialize(function() 
	{
	    scope.database.run("CREATE TABLE IF NOT EXISTS queries (query TEXT, message_id INTEGER, message_from TEXT, message_body TEXT, message_image TEXT)");
   	    scope.database.run("CREATE UNIQUE INDEX IF NOT EXISTS queries_query ON queries (query)");
	});		
}


/**
 * Update details of the last tweet for a query.
 *
 * @api public
 * @param string query
 * @param string messageId
 * @param string messageFrom
 * @param string messageBody
 * @param string messageImage
 * @param function callback Standard callback in the form of function(error, result)
 */
Queries.prototype.update = function(query, messageId, messageFrom, messageBody, messageImage, callback)
{
	//Remember this
	var scope = this;

	//Update the db table	
	this.database.run("UPDATE queries SET message_id = ?, message_from = ?, message_body = ?, message_image = ? WHERE query = ?", messageId, messageFrom, messageBody, messageImage, query, function(error, result)
	{
		if (error && scope.logger)
		{
			scope.logger.error('update failed error =', error);
		}
		else if (scope.logger)
		{
			scope.logger.debug('update succesfull : query =', query, ', messageId =', messageId, ', messagImage =', messageImage);			
		}
		callback(error);
	});
};


/**
 * Refresh the list of queries based on the requirements of all registered devices.
 *
 * @api public
 * @param function callback Standard callback in the form of function(error, result)
 */
Queries.prototype.refresh = function(callback)
{
	var scope = this;

	//Prepare all tasks
	var tasks = [];
	//Add missing
	tasks.push(this.database.run.bind(this.database, "INSERT OR IGNORE INTO queries SELECT DISTINCT query, 0 as message_id, '' as message_from, '' as message_body, '' as message_image FROM device_queries"));
	//Remove unneeded
	tasks.push(this.database.run.bind(this.database, "DELETE FROM queries WHERE NOT EXISTS (SELECT NULL FROM device_queries WHERE device_queries.query = queries.query)"));	

	//Run them in sequence
	async.series(tasks, function(error, result)
	{
		if (error && scope.logger)
		{
			scope.logger.error('refresh failed error =', error);
		}
		else if (scope.logger)
		{
			scope.logger.debug('refresh succesfull');			
		}
		callback(error);
	});	
};


/**
 * Get a list of all current queries. This will automatically call refresh to keep the queries in sync with
 * the registered devices.
 *
 * @api public
 * @param function callback Standard callback in the form of function(error, result)
 */
Queries.prototype.getAll = function(callback)
{
	//Remember this
	var scope = this;

	//Prepare all tasks
	var tasks = [];
	//Refresh
	tasks.push(this.refresh.bind(this));		
	//Fetch all
	tasks.push(this.database.all.bind(this.database, "SELECT * FROM queries"));	

	//Run them in sequence
	async.series(tasks, function(error, result)
	{
		if (error && scope.logger)
		{
			scope.logger.error('getAll failed error =', error);
		}
		else if (scope.logger)
		{
			scope.logger.debug('getAll succesfull : queries =', result[1]);			
		}
		callback(error, result ? result[1] : []);
	});	
};



/**
 * Get a list of all queries for the given device.
 *
 * @api public
 * @param string device Device token
 * @param function callback Standard callback in the form of function(error, result)
 */
Queries.prototype.getByDevice = function(device, callback)
{
	//Remember this
	var scope = this;

	//Query akk devices that have any of the given hashtags
	this.database.all("SELECT dq.no, q.* FROM queries q LEFT JOIN device_queries dq ON dq.query = q.query WHERE dq.device = ? AND q.message_id > 0 ORDER BY dq.no", device, function(error, result)
	{
		if (error && scope.logger)
		{
			scope.logger.error('getForDevice failed error =', error);
		}
		else if (scope.logger)
		{
			scope.logger.debug('getForDevice succesfull : devices =', result);			
		}
		callback(error, result ? result : []);
	});	
};


/**
 * Export
 */
module.exports = Queries;