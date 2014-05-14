/**
 * Dependencies.
 */
var async = require('async');
var request = require('request');
var fs = require('fs');
var urlParser = require('url');
var entities = require('html-entities');



/**
 * Extracts http links from a message and follow any redirects to find a usable image.
 *
 * @api public
 * @param object configuration
 */
function TweetImages(configuration) 
{
	//Configure
	configuration = configuration || {};
	this.logger = (configuration.log4js) ? configuration.log4js.getLogger(configuration.logger || 'selfieshirt.model.TweetImages') : null;
	this.configuration = configuration.configuration || {};
	this.entities = new entities.AllHtmlEntities();
}


/**
 * Fetch the given url and follow all redirects.
 * 
 * @api private
 * @todo we need to protect this from endless redirects.
 * @param string url 
 * @param function callback Callback in the form of function(error, response, body)
 */
TweetImages.prototype.requestPage = function(url, callback)
{
	var scope = this;

	//Rewrite facebook urls to the mobile version becaus the desktop
	//version does not work without js... yay...
	if (url.match(/www.facebook.com/))
	{
		url = url.replace(/www.facebook.com/, 'm.facebook.com');
	}

	if (this.logger)
	{
		this.logger.debug('requestPage : url =', url);		
	}

	//Get the content
	var options = 
	{ 
		url : url, 
		method : 'get', 
		followRedirect : false, 
		jar : true 
	};
	request(options, function(error, response, body)
	{
		if (error)
		{
			if (scope.logger)
			{
				scope.logger.error('requestPage : url =', url, ', error =', error);		
			}				
			callback(error);
			return;
		}

		//Redirect?
		if (response.statusCode == 301 || response.statusCode == 302)
		{
			//Handle relative redirect urls
			var redirectUrl = urlParser.parse(response.headers['location']);
			if (!redirectUrl.host)
			{
				var currentUrl = urlParser.parse(url);
				redirectUrl.protocol = currentUrl.protocol;
				redirectUrl.port = currentUrl.port;
				redirectUrl.host = currentUrl.host;
				redirectUrl.hostname = currentUrl.hostname;
			}

			//Reuest the new url
			scope.requestPage(urlParser.format(redirectUrl), callback);
		}
		else
		{
			//Return the content
			callback(null, response, body);
		}
	})	
}


/**
 * Looks for a og.image meta tag in the given body
 * 
 * @api private
 * @param string body 
 * @returns string 
 */
TweetImages.prototype.extractOpenGraphImage = function(body)
{
	//Determine image source
	var img = body.match(/<meta\s+(property|name)="og.image"\s+content="([^"]*)"/i);	
	if (img)
	{
		if (this.logger)
		{
			this.logger.info('extractOpenGraphImage : image found =', img[2]);		
		}				
		return img[2];
	}
	img = body.match(/<meta\s+content="([^"]*)"\s+(property|name)="og.image"/i);	
	if (img)
	{
		if (this.logger)
		{
			this.logger.info('extractOpenGraphImage : image found =', img[1]);		
		}				
		return img[1];
	}	
	return '';
};


/**
 * Looks for a twitter:image:src meta tag in the given body
 * 
 * @api private
 * @param string body 
 * @returns string 
 */
TweetImages.prototype.extractTwitterMetaImage = function(body)
{
	//Determine image source
	var img = body.match(/<meta\s(property|name)="twitter:image:src"\scontent="([^"]*)"/i);
	if (img)
	{
		if (this.logger)
		{
			this.logger.info('extractTwitterMetaImage : image found =', img[2]);		
		}				
		return img[2];
	}
	img = body.match(/<meta\scontent="([^"]*)"\s(property|name)="twitter:image:src"/i);
	if (img)
	{
		if (this.logger)
		{
			this.logger.info('extractTwitterMetaImage : image found =', img[1]);		
		}				
		return img[1];
	}	
	return '';	
};


/**
 * Looks for a data-resolved-url-large data attribute in the given body
 * 
 * @api private
 * @param string body 
 * @returns string 
 */
TweetImages.prototype.extractTwitterBodyImage = function(body)
{
	//Determine image source
	var img = body.match(/data\-resolved\-url\-large="([^"]*)"/i);
	if (img)
	{
		if (this.logger)
		{
			this.logger.info('extractTwitterBodyImage : image found =', img[1]);		
		}		
		return img[1];
	}
	return '';	
};


/**
 * Looks for a data-store data attribute in the given body
 * 
 * @api private
 * @param string body 
 * @returns string 
 */
TweetImages.prototype.extractFacebookImage = function(body)
{
	//Determine image source
	var img = body.match(/data-store="([^"]*)"/i);
	if (img)
	{
		var store = JSON.parse(this.entities.decode(img[1]));
		if (store && store.imgsrc)
		{
			if (this.logger)
			{
				this.logger.info('extractFacebookImage : image found =', store.imgsrc);		
			}		
			return store.imgsrc;			
		}
	}
	return '';	
};


/**
 * Parse the given message for urls and try to find a suitable image.
 * 
 * @api public
 * @param string message 
 * @param function callback Standard callback in the form of function(error, result)
 */
TweetImages.prototype.extract = function(message, callback)
{
	var scope = this;

	//Get links from message
	//var url = message.match(/(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?/);
	var url = message.match(/(https?:\/\/)[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/);
	if (!url)
	{
		scope.logger.info('extract : no url found in message =', message);		
		callback(null, '');
		return;
	}

	if (scope.logger)
	{
		scope.logger.debug('extract : url =', url[0]);			
	}

	this.requestPage(url[0], function(error, response, body) 
	{
		if (error)
		{
			if (scope.logger)
			{
				scope.logger.error('Error : url =', url, ', error =', error);			
			}
			callback(error);
	  		return;
		}

		//Check for image response
		if (response.headers['content-type'] == 'image/jpeg' || 
			response.headers['content-type'] == 'image/jpg' || 
			response.headers['content-type'] == 'image/png')
		{
			if (scope.logger)
			{
				scope.logger.debug('extract : image type = direct');			
			}				
			callback(null, url[0]);			
			return;
		}

		//Try image sources
		var image = '';
		if (image == '' && body.match(/<title>[\s\n\t\r]*Twitter/i))
		{
			if (scope.logger)
			{
				scope.logger.info('extract : image type = twitter');			
			}				
			image = scope.extractTwitterBodyImage(body);
		}
		if (image == '' && body.match(/<head title="Foto"><title>Foto<\/title>/i))
		{
			if (scope.logger)
			{
				scope.logger.info('extract : image type = facebook');			
			}				
			image = scope.extractFacebookImage(body);
		}

		//Fallbacks
		if (image == '')
		{
			if (scope.logger)
			{
				scope.logger.debug('extract : image type unkown - try opengraph');			
			}				
			image = scope.extractOpenGraphImage(body);
		}
		if (image == '')
		{
			if (scope.logger)
			{
				scope.logger.debug('extract : image type unkown - try twitter');			
			}	
			image = scope.extractTwitterMetaImage(body);			
		}
		if (image == '')
		{
			if (scope.logger)
			{
				scope.logger.warn('extract : no image type found for ' + url[0]);		
			}	
		}
		
		//Done
		callback(null, image);
	});	
};

/**
 * Export
 */
module.exports = TweetImages;