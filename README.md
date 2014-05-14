# #SelfieShirt Server

## What?
This is a subproject of the [#SelfieShirt](https://github.com/syzygy-ffm/selfieshirt). If you landed here by accident you should first checkout the short intro movie on the [accompanying website](http://syzygy.de/selfieshirt).

The server takes care of device registration, twitter polling, image extraction and sending push notifications.

![Overview](https://raw.githubusercontent.com/syzygy-ffm/selfieshirt/master/Content/Server-HowItWorks.jpg)


## Overview

### Device registration
The [iOS application](https://github.com/syzygy-ffm/selfieshirt-ios) allows the user to define three hashtag queries that will be sent accompanied by the device token to the server to register a device. This is done via a simple POST request to [/register](selfieshirt/routes/register.js)

### Twitter polling
All registered queries will be polled via twitter's search api. If the latest tweet of such a query has changed it will be persisted in the database and all subscribed devices will be notified via a push notification. If you want to change how this is done take a look at [updateTwitter.js](selfieshirt/tasks/updateTwitter.js).

### Image extraction
Every tweet is parsed for urls that will be fetched (honoring redirects) and then searched for possible images (e.g. open graph meta tags). If you want to add custom image extractions you can do that in the class [TweetImage](selfieshirt/model/TweetImages.js).

### Push notifications
After new tweets are found all devices that subscribed to the appropriate queries will get informed via a push notifcation. If you want to change how this is done take a look at [updateTwitter.js](selfieshirt/tasks/updateTwitter.js) and [Devices.js](selfieshirt/model/Devices.js). 

There is one special case that needs a work-around. The ble-shield has a [firmware problem](http://www.seeedstudio.com/forum/viewtopic.php?f=16&t=4830&p=18393&hilit=xadow+ble#p18393) that will prevent it to wake up again after going into sleep mode (which is after about 5 minutes). the only way around this is a) press the reset button on the controller or b) make sure the ble has work todo within that timeframe so that it never enters sleep mode. we decided that b) is more usable (not really suprising, eh?) and so all devices will get at least one notification sent every 5 minutes. The [iOS application](https://github.com/syzygy-ffm/selfieshirt-ios) will then take care of sending the ble something to think about.

## What do i needed?
 - Server running nodejs
 - [Apple developer account](https://developer.apple.com/devcenter/ios/index.action) for push notifications
 - [Twitter API key](https://dev.twitter.com/) to use their search

## Installing
The examples given here are based on installing on a ubuntu linux box. It should roughly work on other systems using a different package manager (e.g. yum).

### Install node, npm and git
You will need to install nodejs, npm and git on your server. Most linux distibutions provide nodejs via their package manager. First check if the version available is at least 0.8.x 

	sudo apt-cache showpkg nodejs
	
If it seems ok you can install it via

	sudo apt-get install nodejs npm git

If the version is not sufficient you need to install nodejs via a custom repository. 

For ubunutu it goes something like this :

	sudo apt-get install git software-properties-common python-software-properties
	sudo apt-add-repository ppa:chris-lea/node.js
	sudo apt-get update
	sudo apt-get install nodejs

### Download the code
Create a directory where you want to host the server code and clone the git repo.

	sudo mkdir -p /srv/selfieshirt/server		
	cd /srv/selfieshirt/server
	sudo git clone https://github.com/syzygy-ffm/selfie-shirt-server.git .
	
### Install dependencies via npm
Change into the directory /srv/selfieshirt/serve and execute npm install.
		
	cd /srv/selfieshirt/server
	sudo npm install

### Make sure /data is writable
The directory /data needs to be writable by the nodejs process as the sqlite database will be created here.

	sudo mkdir -p /srv/selfieshirt/server/data
	sudo chmod +w /srv/selfieshirt/server/data

### Make sure /certificates is available
The directory /certificates contains the push certifcates and needs to be readable by nodejs process. 

	sudo mkdir -p /srv/selfieshirt/server/certificates

### Prepare push certifcates
Create your provisioning profile and the appropriate apn certificate in the apple developer portal and download the apn certificate as `apns-development.cert`. 
Open your KeyChain and export the private key of your developer certificate as `development.p12`.

Use openssh to generate the needed .pem files :

	openssl pkcs12 -in development.p12 -out development-key.pem -nodes
	openssl x509 -in development.cert -inform DER -outform PEM -out development-certificate.pem

Copy the two .pem files into the /srv/selfieshirt/server/certificates folder on the server.

### Prepare twitter api key
Register a twitter account and add a new twitter application. Then prepare the key used to authenticate api calls as described at [https://dev.twitter.com/docs/auth/application-only-auth](https://dev.twitter.com/docs/auth/application-only-auth).

### Create a environment configuration
Configuration is based around the idea of environments which enables you to have different configurations for e.g. development and production. Assuming you want to use the development environment start by copying the `example-environment.js` to `development.js`
	
	sudo cp /srv/selfieshirt/server/configuration/example-environment.js /srv/selfieshirt/server/configuration/development.js

Now edit the file with your favorite text editor:

	sudo pico /srv/selfieshirt/server/configuration/development.js
	
Make sure that the correct certificates and twitter api key are used. All pathes are relative to the server root (e.g. `certificates/development-key.pem`).

### Running it
To run it you have to set the correct envirnment via a environment variable before you start the server. Here is a one liner that starts the server in development mode: 

	sudo NODE_ENV=development node /srv/selfieshirt/server/server.js

### Making it a service
If you want to run it as a service you can use the templates provided in `/templates` for upstart and logrotate. Just copy them to the appropriate places:
	
	sudo cp /srv/selfieshirt/server/templates/upstart.conf /etc/init/selfieshirt.conf
	sudo cp /srv/selfieshirt/server/templates/logrotate.conf /etc/logrotate.d/selfieshirt

and restart logrotate 
	
	sudo logrotate -f /etc/logrotate.conf
	
No you can start/stop/restart the server with `sudo service selfieshirt start`.

## Developing
The code is well commented so you should be able to tailor it to your needs. If you have never worked with nodejs go check out the [nodejs website](http://nodejs.org/) - they have tutorials and demo code that will help learning the basics.

To get a better understanding of what the initial code does you should set the debug level to `NOTICE` in your configuration file :

	configuration.logger.level = "NOTICE";

## Share it!
Build your own Shirt. Create, imitate, improvise, play around. And don’t forget to share: #SelfieShirt  
If you have any questions see [syzygy.de/selfieshirt](http://syzygy.de/selfieshirt) for more details and contact information.