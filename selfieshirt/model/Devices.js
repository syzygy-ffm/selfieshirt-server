/**
 * Dependencies.
 */
var async = require('async');
var apns = require('apn'); 
var _ = require('lodash'); 


/**
 * Manages all interactions with devices :
 *  - register and unregister
 *  - send notifications
 *  - get devices based on queries they are interested in
 *
 * @api public
 */
function Devices(configuration) 
{
	//Configure
	configuration = configuration || {};
	this.database = configuration.database || null;	
	this.logger = (configuration.log4js) ? configuration.log4js.getLogger(configuration.logger || 'selfieshirt.model.Devices') : null;
	this.models = configuration.models || null;
	this.configuration = configuration.configuration || {};

	// Make sure database tables exist
	var scope = this;
	this.database.serialize(function() 
	{
	    scope.database.run("CREATE TABLE IF NOT EXISTS devices (device TEXT, seen INTEGER, talked INTEGER)");
	    scope.database.run("CREATE TABLE IF NOT EXISTS device_queries (device TEXT, no INTEGER, query TEXT)");
   	    scope.database.run("CREATE UNIQUE INDEX IF NOT EXISTS devices_device ON devices (device)");
   	    scope.database.run("CREATE UNIQUE INDEX IF NOT EXISTS device_queries_unqique ON device_queries (device, query)");   	    
	});		
}


/**
 * Simple helper that makes building queries with many placeholders a bit easier.
 * 
 * @api private
 * @param number count 
 * @returns string 
 */
Devices.prototype.generatePlaceholders = function(count)
{
	var result = '';
	for (var i = 0; i < count; i++)
	{
		if (i > 0)
		{
			result+= ', ';
		}
		result+= '?';
	}
	return result;
}


/**
 * Prepares a hashtag query in the form tag1,tag2,.... into a twitter
 * query in the form of #tag1 and tag2 and .....
 *
 * @api private
 * @param string query
 * @returns string
 */
Devices.prototype.prepareQuery = function(query)
{
	var tags = query.split(',');
	var result = '';
	tags.forEach(function(tag)
	{
		result+= (result != '') ?  ' and ' : '';
		result+= '#' + tag.trim().toLowerCase();
	});
	return result;
}


/**
 * Registers a device via it's token and a optional list of queries it is interested in.
 *
 * @api public
 * @param string device A device token
 * @param array queries A list of queries in the form of ['#tag1 and #tag2', ....]
 * @param function callback Standard callback in the form of function(error, result)
 */
Devices.prototype.register = function(device, queries, callback)
{
	var scope = this;

	//Prepare twitter query
	queries = queries.map(this.prepareQuery.bind(this));

	//Prepare all queries
	var tasks = [];
	tasks.push(this.database.run.bind(this.database, "INSERT OR REPLACE INTO devices VALUES (?, ?, ?)", device, Date.now(), Date.now()));
	tasks.push(this.database.run.bind(this.database, "DELETE FROM device_queries WHERE device = ? AND query NOT IN (" + this.generatePlaceholders(queries.length) + ")", [device].concat(queries)));	
	queries.forEach(function(query, no)
	{
		tasks.push(this.database.run.bind(this.database, "INSERT OR REPLACE INTO device_queries VALUES (?, ?, ?)", device, no, query));
	}, this);

	//Run them in sequence
	async.series(tasks, function(error)
	{
		if (error && scope.logger)
		{
			scope.logger.error('register failed : device =', device, ', queries =', queries, ', error =', error);
		}
		else if (scope.logger)
		{
			scope.logger.debug('register succesfull : device =', device, ', queries =', queries);			
		}
		callback(error);
	});
};


/**
 * Unregisters a device via it's token.
 *
 * @api public
 * @param string device
 * @param function callback Standard callback in the form of function(error, result)
 */
Devices.prototype.unregister = function(device, callback)
{
	var scope = this;

	//Prepare all queries
	var tasks = [];
	tasks.push(this.database.run.bind(this.database, "DELETE FROM devices WHERE device = ?", device));
	tasks.push(this.database.run.bind(this.database, "DELETE FROM device_queries WHERE device = ?", device));	

	//Run them in sequence
	async.series(tasks, function(error)
	{
		if (error && scope.logger)
		{
			scope.logger.error('unregister failed : device =', device, ', error =', error);
		}
		else if (scope.logger)
		{
			scope.logger.debug('unregister succesfull : device =', device);			
		}
		callback(error);
	});
};


/**
 * Notify a list of devices with informations about the queries that actually changed.
 *
 * @api public
 * @param array devices A list of devices in the form of [{ device : '', 'queries' : { 0:true } }]
 * @param function callback Standard callback in the form of function(error, result)
 */
Devices.prototype.notify = function(devices, callback)
{
	var scope = this;
	var connection = new apns.Connection(this.configuration.apns);

	connection.on('transmissionError', function(error, notification, device) 
	{
		if (scope.logger)
		{
			scope.logger.error('Could not send notification : notification.device =', notification.device);
		}		    	
	});

	connection.on('transmitted', function(notification, device) 
	{
		if (scope.logger)
		{
			scope.logger.debug('Sent notification : notification.device =', notification.device);
		}		    	
	});

	connection.on('timeout', function () 
	{
		if (scope.logger)
		{
			scope.logger.error('Connection timeout');
		}				
	});

	connection.on('socketError', function (error) 
	{
		if (scope.logger)
		{
			scope.logger.error('Socket error', error);
		}				
	});

	devices.forEach(function(device)
	{
		//Store the timestamp for keep-alive
		scope.database.run("UPDATE devices SET talked = ? WHERE device = ?", Date.now(), device.device);

		//Only send to actual device tokens
		if (device.device.length != 64)
		{
			return;
		}

		//Send notifcation
		var notification = new apns.Notification(device.queries || {});
		notification.device = new apns.Device(device.device);
		notification.contentAvailable = true;
		if (scope.logger)
		{
			scope.logger.debug('Sending notification device =', device.device);
		}		
		connection.sendNotification(notification);	
	});

	//We dont report errors for notifcations
	//because there is no way to handle them - so logging the incident must suffice.
	callback();
};


/**
 * Gets a list of devices that are interested in any of the given queries.
 *
 * @api public
 * @param array queries A list of queries in the form of ['#tag1 and #tag2', ....]
 * @param function callback Standard callback in the form of function(error, result)
 */
Devices.prototype.getByQueries = function(queries, callback)
{
	var scope = this;

	//Query all devices that have any of the given hashtags
	this.database.all("SELECT device, query, no FROM device_queries WHERE query IN (" + this.generatePlaceholders(queries.length) + ")",  queries, function(error, rows)
	{
		var result = [];
		if (error)
		{
			if (scope.logger)
			{
				scope.logger.error('getByQueries failed error =', error);
			}
		}
		else
		{
			//Filter duplicates and prepare result format
			var devices = {};
			rows.forEach(function(device)
			{
				if (_.isUndefined(devices[device.device]))
				{
					devices[device.device] = { device : device.device, queries : {} };
				}
				devices[device.device]['queries'][device.no] = true;
			});
			result = _.values(devices);
 			if (scope.logger)			
 			{
				scope.logger.debug('getByQueries succesfull : devices =', result);
 			}
		}
		callback(error, result);
	});	
};


/**
 * Gets a list of devices that we did not talk to withion the given time.
 *
 * @api public
 * @param int ms Time in ms 
 * @param function callback Standard callback in the form of function(error, result)
 */
Devices.prototype.getNotTalkedTo = function(ms, callback)
{
	var scope = this;
	var timestamp = Date.now() - ms;

	//Query all devices that we havent seen since timestamp	
	this.database.all("SELECT device FROM devices WHERE talked < ?", timestamp, function(error, result)
	{
		if (error)
		{
			if (scope.logger)
			{
				scope.logger.error('getNotTalkedToWithin failed error =', error);
			}
		}
		else
		{
 			if (scope.logger)			
 			{
				scope.logger.debug('getNotTalkedToWithin succesfull : devices =', result);
 			}
		}
		callback(error, result);
	});	
};

/**
 * Export
 */
module.exports = Devices;