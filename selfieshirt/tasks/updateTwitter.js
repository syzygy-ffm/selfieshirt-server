/**
 * The updateTwitter task will periodically query twitter for all known
 * hashtag queries. In case of a change all devices that were interested in that specific query
 * will receive a notification.
 */
module.exports = function(context)
{
	/**
	 * Dependencies.
	 */
	var async = require('async');
	var logger = (context.log4js) ? context.log4js.getLogger('selfieshirt.tasks') : null;

	/**
	 *
	 */
	function updateTwitter()
	{
		var started = Date.now(); 
		var ended = false;

		if (logger)
		{
			logger.info('updateTwitter (' + started + ') - started ---------------------');
		}

		//Get all queries
		context.models.queries.getAll(function(error, queries)
		{
			if (error)
			{
				return;
			}

			var tasks = [];
			var changes = [];
			var enabled = true;

			//Process each query
			queries.forEach(function(query)
			{
				tasks.push(function(cb)
				{
					if (!enabled)
					{
						if (logger)
						{
							logger.info('updateTwitter (' + started + ') - skipping because enabled = false');
						}						
						cb();
						return;
					}

					if (logger)
					{
						logger.info('updateTwitter (' + started + ') - get latest : query =', query.query, ', messageId =', query.message_id);
					}						

					//Ask twitter for latest 
					context.models.twitter.search(query.query, query.message_id, function(error, tweet)
					{
						//Stop here if error occured
						if (error)				
						{
							if (logger)
							{
								logger.info('updateTwitter (' + started + ') - talking to twitter failed : query =', query.query, ', messageId =', query.message_id);
							}		
							
							enabled = false;
							cb(null, error);
							return;
						}

						//Stop here nothing has changed
						if (!tweet || tweet.id == query.message_id)				
						{
							if (logger)
							{
								logger.info('updateTwitter (' + started + ') - query did not change : query =', query.query, ', messageId =', query.message_id);
							}		
							cb(null);
							return;
						}

						if (logger)
						{
							logger.info('updateTwitter (' + started + ') - query changed : query =', query.query);
						}		

						//Update database
						context.models.queries.update(query.query, tweet.id, tweet.from, tweet.body, tweet.image, function(error)
						{
							changes.push(query.query);
							cb(null, error);
						});
					});
				});
			});

			//Send notifications to devices where queries have changed
			tasks.push(function(cb)
			{	
				if (changes.length)
				{				
					if (logger)
					{
						logger.info('updateTwitter (' + started + ') - sending notifications for : changes =', changes);
					}	

					context.models.devices.getByQueries(changes, function(error, devices)
					{
						if (error)
						{
							if (logger)
							{
								logger.error('updateTwitter (' + started + ') - getting devices failed : error =', error);
							}	
							cb(error);
							return;
						}

						if (logger)
						{
							logger.info('updateTwitter (' + started + ') - sending notifications to : devices =', devices);
						}	

						context.models.devices.notify(devices, cb);
					});
				}
				else
				{
					if (logger)
					{
						logger.info('updateTwitter (' + started + ') - no changes found');
					}	
					cb();
				}
			});

			//Send keep-alive notifications to devices we havent spoke to in a while
			tasks.push(function(cb)
			{	
				context.models.devices.getNotTalkedTo(context.configuration.updateTwitter.keepAlive, function(error, devices)
				{
					if (error)
					{
						if (logger)
						{
							logger.error('updateTwitter (' + started + ') - getting keep-alive devices failed : error =', error);
						}	
						cb(error);
						return;
					}

					if (logger)
					{
						logger.info('updateTwitter (' + started + ') - sending keep-alive notifications to : devices =', devices);
					}	

					context.models.devices.notify(devices, cb);
				});
			});

			//Start the all tasks one after the other
			async.series(tasks, function(error, result)
			{
				//Safeguard for multiple calls to callbacks
				if (ended)
				{
					logger.warn('updateTwitter (' + started + ') - already ended =', ended);	
					return;
				}

				if (logger)
				{
					if (error)
					{
						logger.error('updateTwitter (' + started + ') - failed : error =', error);											
					}
					logger.info('updateTwitter (' + started + ') - next execute in', context.configuration.updateTwitter.interval);					
					logger.info('updateTwitter (' + started + ') - finished ---------------------');					
				}
				
				ended = Date.now(); 				
				setTimeout(updateTwitter, context.configuration.updateTwitter.interval);
			});
		});
	}

	//Initial update
	updateTwitter();
};