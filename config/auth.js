// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

	'facebookAuth' : {
		'clientID' 		: '1479748808806951', // your App ID
		'clientSecret' 	: '511e729aea771549f09fff74f85bdb0c', // your App Secret
		'callbackURL' 	: '/auth/facebook/test/callback'
	}

};