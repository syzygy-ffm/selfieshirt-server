/**
 * Mobile registration routes
 */
module.exports = function(server, context)
{
	var logger = context.log4js ? context.log4js.getLogger('selfieshirt.routes') : null;
	var validator = require('validator');

	/**
	 * POST /register
	 *
	 * Register a device via its token and queries.
	 *
	 * curl --data "token=1&hashtags[]=selfie&hashtags[]=foodporn" http://localhost:3000/register
	 */
	server.post('/register', function(request, response)
	{
		//Get params
		var token = request.body.token || '';
		var hashtags = request.body.hashtags || [];

		//Register
		context.models.devices.register(token, hashtags, function(error)
		{
			if (logger)
			{
				logger.info('/register token =', token, ', hashtags =', hashtags.join('; '));
			}			
			if (error)
			{
				if (logger)
				{
					logger.error('/register failed ', error);
				}				
				response.json(
				{
					success : false
				});
			}
			else
			{		
				response.json(
				{
					success : true
				});
			}
		});
	});	
};