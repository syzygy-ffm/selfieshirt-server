/**
 * Dependencies.
 */
var async = require('async');
var querystring = require('querystring');
var http = require('https');
var fs = require('fs');


/**
 * Twitter search client.
 *
 * @api public
 */
function Twitter(configuration) 
{
	//Configure
	configuration = configuration || {};
	this.database = configuration.database || null;	
	this.logger = (configuration.log4js) ? configuration.log4js.getLogger(configuration.logger || 'selfieshirt.model.Twitter') : null;
	this.models = configuration.models || null;
	this.configuration = configuration.configuration || {};
	this.applicationToken = configuration.applicationToken || '';	
	this.bearerToken = configuration.bearerToken || false;
}


/**
 * Authenticate with the twitter api and get a bearerToken for all fututre requests
 *
 * @api private
 * @param function callback Standard callback in the form of function(error, result)
 */
Twitter.prototype.authenticate = function(callback)
{
	//Remember this
	var scope = this;

	//Check if we need to fetch token
	if (this.bearerToken)
	{
		callback(null, this.bearerToken);
		return;
	}

  	// Post data
  	var data = querystring.stringify(
  	{
    	'grant_type' : 'client_credentials'
  	});

  	// Request options
  	var options = 
  	{
    	host: 'api.twitter.com',
      	port: '443',
      	path: '/oauth2/token',
      	method: 'POST',
      	headers: 
      	{
        	'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          	'Content-Length': data.length,
          	'Authorization' : 'Basic ' + this.applicationToken
      	}
  	};

  	// Set up the request
  	var request = http.request(options, function(response) 
  	{
  		var responseData = '';
    	response.setEncoding('utf8');
      	
      	response.on('data', function (chunk) 
      	{
      		responseData+= chunk;
      	});

      	response.on('end', function (chunk) 
      	{
        	var responseObject = JSON.parse(responseData);
        	if (responseObject && responseObject.access_token)
        	{
        		scope.bearerToken = responseObject.access_token;
        		callback(null, scope.bearerToken);
        	}
        	else
        	{
        		callback('Could not fetch bearer token', responseData);
        	}
      	});      	
  	});  		

  	// handle errors
  	request.on('error', function (error) 
  	{
		if (scope.logger)
		{
			scope.logger.error('authenticate - Could not execute request, error =', error);
		} 
		callback(error);
  	}); 

  	// post the data
  	request.write(data);
  	request.end();		  	
};


/**
 * Queries the twitter api for the latest tweets for the given query that are newer than lastId.
 *
 * @api public
 * @param string query
 * @param number lastId
 * @param function callback Standard callback in the form of function(error, result)
 */
Twitter.prototype.search = function(query, lastId, callback)
{
	var scope = this;
	this.authenticate(function(error)
	{
		if (error)
		{
			callback(error);
			return;
		}

		// Get data
		var data = querystring.stringify(
		{
		  	'q' : query,
		  	'count' : 1,
		  	'include_entities' : false,
		  	'result_type' : 'recent',
		  	'since_id' : lastId
		});

		// Request options
		var options = 
		{
		  	host: 'api.twitter.com',
		  	port: '443',
		  	path: '/1.1/search/tweets.json?' + data,
		  	method: 'GET',
		  	headers: 
		  	{
		      	'Authorization' : 'Bearer ' + scope.bearerToken
		  	}
		};

		// Set up the request
		var request = http.request(options, function(response) 
		{
		  	response.setEncoding('utf8');		

		  	response.on('error', function (error) 
		  	{
		  		if (scope.logger)
		  		{
		  			scope.logger.error(error);
		  		}
		  	});

		  	var content = '';
		  	response.on('data', function (chunk) 
		  	{
		      	content+= chunk;
		  	});

		  	response.on('end', function (chunk) 
		  	{
				var searchResult = JSON.parse(content);
		      	var result = false;
		      	if (searchResult && searchResult.statuses && searchResult.statuses.length)
		      	{
		      		result = 
		      		{
		      			id : searchResult.statuses[0].id,
		      			body : searchResult.statuses[0].text,
		      			from : searchResult.statuses[0].user.screen_name,
		      			image : ''
		      		};
		      	}
		      	else
		      	{
			  		if (!searchResult || !searchResult.statuses)
			  		{
			  			if (scope.logger)
			  			{
				  			scope.logger.warn('search - Twitter api response not as expected, content =', content);
			  			}
			  		}	
			  		if (searchResult && searchResult.errors)
			  		{
				  		callback(searchResult.errors);
			  		}
			  		else
			  		{
			  			callback(null, result);
			  		}
			  		return;
		      	}
		      	if (result && result.body.length && result.id != lastId)
		      	{
					scope.models.tweetImages.extract(result.body, function(error, image)
					{
						result.image = image;
						callback(null, result);
					});
		      	}
		      	else
		      	{
			      	callback(null, result);
		      	}
		  	});      
		});

	  	// handle errors
	  	request.on('error', function (error) 
	  	{
			if (scope.logger)
			{
				scope.logger.error('search - Could not execute request, error =', error);
			} 
			callback(error);
	  	}); 

		// get the data
		request.end(); 		
	});
};

/**
 * Export
 */
module.exports = Twitter;