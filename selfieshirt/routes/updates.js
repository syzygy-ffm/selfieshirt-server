module.exports = function(server, context)
{
	var logger = context.log4js ? context.log4js.getLogger('selfieshirt.routes') : null

	/**
	 * GET /updates/:device
	 *
	 * Fetch the current tweets for the given device
	 */
	server.get('/updates/:device', function(request, response)
	{
		var device = request.params.device || '';
		context.models.queries.getByDevice(device, function(error, queries)
		{
			if (error)
			{
				if (logger)
				{
					logger.error('/updates/' + token + ' failed, error =', error);
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
					success : true,
					queries : queries
				});
			}
		});
	});	
};