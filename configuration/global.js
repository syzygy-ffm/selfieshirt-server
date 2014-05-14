module.exports = 
{
	"port" : process.env.NODE_PORT || 3000,
	"logger" : 
	{
		"level" : "DEBUG"
	},
	"database" :
	{
		"file" : "data/database.sqlite"
	},
	"twitter" :
	{
		"applicationToken" : ""
	},
	"updateTwitter" :
	{
		"interval" : 60000,
		"keepAlive" : 240000
	},
	"apns" :
	{
   		"key" : "",
   		"cert" : "",
   		"address" : "gateway.sandbox.push.apple.com"
	}	
};