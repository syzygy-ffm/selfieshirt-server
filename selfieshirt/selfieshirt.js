/**
 * Requirements
 */
var express = require('express');
var context = require('./context.js')(express); 
var logger = context.log4js ? context.log4js.getLogger('server') : null
var request = require('request');


/**
 * Handle exceptions
 */
process.on('uncaughtException', function(error) 
{
	if (logger)
	{
		logger.error('--------------------------------------------------');
		logger.error('Catched exception:', error.message);
		logger.error(error.stack);		
	}
	process.exit(1);
});


/**
 * Create Server
 */
var server = require('http').Server();
var httpServer = express();
httpServer.configure(function() 
{
	httpServer.use(require('./express/connect-logger')(context));
	httpServer.use(express.compress());
	httpServer.use(express.json());
	httpServer.use(express.urlencoded());		
	httpServer.use(httpServer.router);
});
require('./routes/index.js')(httpServer, context);	
server.addListener('request', httpServer);	


/**
 * Start server
 */
if (logger)
{
	logger.info('--------------------------------------------------');
	logger.info('Starting #Selfie-Shirt Server');
	logger.info('  > working in environment ' + (context.configuration.environment));
	logger.info('  > listening on port ' + (context.configuration.port));	
}
server.listen(context.configuration.port);


/**
 * Add twitter update task
 */
require('./tasks/updateTwitter.js')(context);	

