module.exports = function(server, context)
{
	var logger = context.log4js ? context.log4js.getLogger('selfieshirt.routes') : null;

	/**
	 * POST /unregister
	 *
	 * Unregister a device via its token.
	 *
	 * curl --data "token=1" http://localhost:3000/unregister
	 */
	server.post('/unregister', function(request, response)
	{
		var token = request.body.token || '';
		context.models.devices.unregister(token, function(error)
		{
			if (logger)
			{
				logger.info('/unregister token =', token);
			}				
			if (error)
			{
				if (logger)
				{
					logger.error('/unregister failed ', error);
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