
/**
 * Requirements
 */
var logger = require('log4js').getLogger('cluster');
var cluster = require('cluster');


/**
 * Determine worker counts
 */
var processCount = 1;
var restartDelay = 2000;


/**
 * Start API processes
 */
logger.info('Starting ' + processCount + ' workers.');
cluster.setupMaster(
{
	exec : __dirname + '/selfieshirt/selfieshirt.js'
});
for (var i = 0; i < processCount; i++) 
{
    cluster.fork();      
}

/**
 * Restart cluster nodes when they die
 */
cluster.on('exit', function(worker, code, signal) 
{
	logger.info("Worker " + worker.process.pid + " (#" + worker.id + ") died => restarting in " + restartDelay + "ms");
  	setTimeout(cluster.fork, restartDelay);
});