/**
 * A simple logger which dispays color coded response code and request time
 * for each request
 */
module.exports = function(context)
{
	var logger = (context.log4js) ? context.log4js.getLogger('selfieshirt.connect') : null;	
	var red = '\u001b[31m';
	var green = '\u001b[32m';
	var cyan = '\u001b[36m';
	var black = '\u001b[37m';
	var reset = '\u001b[0m';

	return function(request, response, next)
	{
		//Not logger?
		if (!logger)
		{
			return next();
		}

		//Already started?
		if (request._startTime)
		{
			return next();
		}
		
		//Remember time
		request._startTime = Date.now();

		//Display log when request has finished
		response.on('finish', function()
		{
			var time = Date.now() - request._startTime;
			var message = black + '[' + request.connection.remoteAddress + '] ' + request.originalUrl + reset;
			if (request.user && request.user.id)
			{
				message+= black + ' - userId '  + request.user.id + ' - ' + reset;							
			}						
			if (response.statusCode >= 400)
			{
				message+= red;
			}
			else
			{
				message+= green;
			}
			message+= ' ' + response.statusCode + ' ' + reset;
			message+= cyan + time + 'ms'  + reset;
			message+= '     ----------------------';
			logger.info(message);				
		});

		next();
	};
};