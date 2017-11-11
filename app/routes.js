// app/routes.js
const request = require('request');
const Wit = require('node-wit').Wit;
const log = require('node-wit').log;
const FB_PAGE_TOKEN = "EAAVB0t4bEicBANZB1PZAacdIbv9dbp2euMcrW20PZAHqPDGgZCN5kZA8ZCDHTWIPsQLtKxmyZCZCveOfTNeLldYRZCx8kEi0DlcF1G0393DmPoUZBl4ykqJbTPdoKVRh7Na5vLTpzjesCOceRT0ZBdgPt6LBFLwZClthjxDFQgNK9t39u7h7oaMmo5nL";
const WIT_TOKEN = "ZNAZKF2XUKTFS2G7ZLLBGDHJMB6DC4AP";
module.exports = function(app, passport) {

	// =====================================
	// FACEBOOK ROUTES =====================
	// =====================================
	// route for facebook authentication and login
	app.get('/auth/facebook/test/:senderId', passport.authenticate('facebook', { scope : 'email' }));

	// handle the callback after facebook has authenticated the user
	app.get('/auth/facebook/test/callback',
		passport.authenticate('facebook'));

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	// =====================================
	// MSG    ==============================
	// =====================================
	app.get('/webhook', function(req, res) {
		get_wit(req, res);
	});
	app.post('/webhook', function(req, res) {
		post_wit(req, res);
	});
};

// route middleware to make sure
function isLoggedIn(req, res, next) {
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/');
}





// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, text) => {
  const body = {
    recipient: { id },
    message: text,
  };
  console.log(body)
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  request.post({url:'https://graph.facebook.com/me/messages?' + qs, json:body, headers:{"Content-Type":"application/json"}}, function(err,httpResponse,body){
  	console.log(err)
  	// console.log(body);
  	// console.log(httpResponse);
  	console.log(err);
  	var json = body;
  	if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  })
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

// Our bot actions
const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return fbMessage(recipientId, text)
      .then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  }
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  logger: new log.Logger(log.INFO)
});


function get_wit (req, res){
  if (req.query['hub.verify_token'] === 'EAAVB0t4bEicBANZB1PZAacdIbv9dbp2euMcrW20PZAHqPDGgZCN5kZA8ZCDHTWIPsQLtKxmyZCZCveOfTNeLldYRZCx8kEi0DlcF1G0393DmPoUZBl4ykqJbTPdoKVRh7Na5vLTpzjesCOceRT0ZBdgPt6LBFLwZClthjxDFQgNK9t39u7h7oaMmo5nL') {
		console.log(req.query['hub.challenge']);
		console.log(req.query['hub.challenge'][0]);
		res.contentType = "text/plain";
		res.send(req.query['hub.challenge'])
		return;
	}
	res.send('Error, wrong token')
}
function post_wit (req, res) {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;

  if (data.object === 'page') {
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message && !event.message.is_echo) {
          // Yay! We got a new message!
          // We retrieve the Facebook user ID of the sender
          const sender = event.sender.id;

          // We retrieve the user's current session, or create one if it doesn't exist
          // This is needed for our bot to figure out the conversation history
          const sessionId = findOrCreateSession(sender);

          // We retrieve the message content
          const {text, attachments} = event.message;

          if (attachments) {
            // We received an attachment
            // Let's reply with an automatic message
            fbMessage(sender, 'Sorry I can only process text messages for now.')
            .catch(console.error);
          } else if (text) {
            // We received a text message
						wit.message(text, sessions[sessionId].context)
						.then((body) => {
							console.log(body.entities);
							console.log(sessions[sessionId].fbid);
							const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
							request('https://graph.facebook.com/v2.9/'+ sessions[sessionId].fbid+'?fields=id,gender,email&' + qs, function (error, response, body) {
							  console.log('error:', error); // Print the error if one occurred
							  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
							  console.log('body:', body); // Print the HTML for the Google homepage.
							});
              //receive!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
              const msg = testTemplate('Log in', event.sender.id, event.recipient.id);
  						return fbMessage(event.sender.id, msg);
							//console.log(body);
						})
						.catch(console.error);
          }
        } else {
          console.log('received event', JSON.stringify(event));
        }
      });
    });
  }
  res.send(200);
}

function closeWindow (req, res){
  var body = '<script type="text/javascript"> window.close(); </script>';
  res.writeHead(200,{
  'Content-Length':Buffer.byteLength(body),
  'Content-Type':"text/html"});
  res.write(body);
  res.end();

};

function testTemplate (msg, senderId, pageId) {
  return {
      attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: msg,
        buttons: [
          {
            type: 'web_url',
            title: 'Log in with Facebook',
            url: `https://messengerbank-lagzda.c9users.io/auth/facebook/test/${senderId}/?pageId=${pageId}`
          }
        ]
      }
      }
  };
}

function detectMobile (req, res, next) {
  const ua = req.headers['user-agent'].toLowerCase(),
    isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(ua) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0, 4));
  req.mobile = !!isMobile;
  next();
}