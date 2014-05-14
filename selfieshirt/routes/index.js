/**
 * Registers all routes
 */
module.exports = function(server, context)
{
	require('./register.js')(server, context);	
	require('./unregister.js')(server, context);
	require('./updates.js')(server, context);	
};