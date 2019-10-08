var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.set('port', (process.env.PORT || 5000));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/webhook/', function (request, response) {
  if (request.query['hub.verify_token'] === 'Nobroker_Labs') {
    response.send(request.query['hub.challenge'])
  }
  response.send('Error, wrong token')
})

// API endpoint

app.post('/webhook', function (request, response) {
  var data = request.body;
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event

      if (typeof pageEntry.messaging !== 'undefined') {
        pageEntry.messaging.forEach(function(messagingEvent) {
          if (messagingEvent.optin) {
            // receivedAuthentication(messagingEvent);
          } else if (messagingEvent.message) {
            console.log("message received...")
            receivedMessage(messagingEvent);
          } else if (messagingEvent.delivery) {
            // receivedDeliveryConfirmation(messagingEvent);
          } else if (messagingEvent.postback) {
            receivedPostback(messagingEvent);
          } else {
            console.log("Webhook received unknown messagingEvent: ", messagingEvent);
          }
        });
      }
    });

    response.sendStatus(200);
  }
});

var PAGE_ACCESS_TOKEN = "EAAikXHKbMcEBABFDhRdVTVHrxsX3oHbjZANfE2zwwlJem71wT9RZAGnsfNw6Dti5QAOCKaU8AMjMZBog2J7l7xqaGtZCThrzpdaMVag4fOaXrrLshDDvSYbcHoRIX4LHOENQeQjEv9vg1EAujIbbtT8ffvmrMcobq2z71UuCMAZDZD";

var propertyArray = [];

function Property() {
};

function User(){
}

var userMap = {};

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d", 
  senderID, recipientID, timeOfMessage);
  sendTypingAction(senderID, "mark_seen");
  sendTypingAction(senderID, "typing_on");

  if (Object.keys(userMap).length > 100) {
    userMap.splice(-1,1);
  }

  if (!userMap.hasOwnProperty(senderID)) {
    console.log('Adding new user to session: ' + senderID);
    userMap[senderID] = new User();

  } else {
    console.log('User already in session: ' + userMap[senderID]);
  }

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    if (messageText.toLowerCase().indexOf("hi") > -1 || messageText.toLowerCase().indexOf("hello") > -1
        || messageText.toLowerCase().indexOf("hey") > -1) {
      sendGenericMessage(senderID);
      return;
    }

    if (messageText.toLowerCase().indexOf("thnk") > -1 || messageText.toLowerCase().indexOf("thank") > -1 && messageText.length < 20) {
      echoMessage(senderID, "Happy to help!");
      return;
    }

    makeWitCall(messageText, senderID);
    // callZalando(messageText, senderID);
    return;

  } else if (messageAttachments) {
    echoMessage(senderID, "Message with attachments received");
  }
}

function makeWitCall(messageText, senderID) {
    if (senderID === '794951570520699')
      return;
    queryString = encodeURIComponent(messageText);
    witUrl = 'https://api.wit.ai/message?v=20191008&q=' + queryString;
    console.log('senderID: ' + senderID);
    console.log('Wit URL: ' + witUrl);

    var options = {
      uri: witUrl,
      method: 'GET',
      headers: {
          'Authorization': 'Bearer MFCC6KFGHX6MIPWH5EPGD43FEF4MFQHK',
        }
    }

    request(options, function(error, response, body) {
      if(error) {
        echoMessage(senderID, "Oops! AI Engine failed to understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
        this.setTimeout(function() { sendPlansMessage(senderID); }, 3000);

      } else {
          var jsonResponse = JSON.parse(body);
          var results = jsonResponse.entities;
          console.log('wit results received');
          
          var user = userMap[senderID];
          user.containsGreeting = 'false';

          if (!results || typeof results === 'undefined') {
            //this.setTimeout(function() { echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly..."); }, 4000);
            console.log('No results found');
            echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly...");
            return;
          } else if(results.hasOwnProperty('reset')){
              // userMap[senderID] = new User();
              // client.hmset(senderID, JSON.stringify(new User()));
              console.log('reset called');
              delete userMap[senderID];
              echoMessage(senderID, "Session reset for userId: " + senderID);
              return;
          } else if(results.hasOwnProperty('greeting')) {
              console.log('greeting called');
              sendGenericMessage(senderID);
              user.containsGreeting = 'true';
              console.log('processing wit response..');
              processWitRespone(senderID, results, user);
              // this.setTimeout(function() { echoMessage(senderID, 'Please type the location you are looking for rent/buy property: flats in powai mumbai');}, 2000);
          } else {
              console.log('processing wit response..' + results);
              processWitRespone(senderID, results, user);
          }
      }
      return;
    });
}

function processWitRespone(senderID, results, user) {
  var map = {};
  map['color'] = 0;
  map['category'] = 0;
  map['filters'] = 0;

  var queryString = "";

  if(results.hasOwnProperty('color') && typeof results.color  !== 'undefined') {
    user.color = results.color[0].value;
  }

  if(results.hasOwnProperty('category') && typeof results.category  !== 'undefined') {
    user.category = results.category[0].value;
  }


  if(results.hasOwnProperty('filters') && typeof results.filters  !== 'undefined') {
    for (var i=0; i < results.filters.length; i++) {
      if (results.filters[i].value !== 'undefined') {
        console.log(results.filters[i].value);
        if (user.filters && user.filters !== 'undefined')
          user.filters = user.filters + ' ' + results.filters[i].value;
        else
          user.filters = results.filters[i].value;
      }
    }
  }

  console.log("QueryString: " + queryString)
  user.queryString = user.color + ' ' + user.category + ' ' + user.filters;

  userMap[senderID] = user;

  callZalando(queryString, senderID);
}

function callZalando(messageText, senderID) {
    if (senderID === '794951570520699')
      return;
    queryString = encodeURIComponent(messageText);
    witUrl = 'https://en.zalando.de/api/catalog/articles?sort=sale&query=' + queryString;
    console.log('senderID: ' + senderID);
    console.log('Zalando URL: ' + witUrl);

    var options = {
      uri: witUrl,
      method: 'GET'
    }

    request(options, function(error, response, body) {
      if(error) {
        echoMessage(senderID, "Oops! received error from zalando" + error);
      }
      else {
          var jsonResponse = JSON.parse(body);
          var articles = jsonResponse.articles;
          console.log('zalando articles received');

          if (!articles || typeof articles === 'undefined') {
            //this.setTimeout(function() { echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly..."); }, 4000);
            console.log('No articles found');
            echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly...");
            return;

          } else if(articles.length > 5){
            var propertyArray = [];

            for (var index=1; index <= 7; index++) {
              var i;
              if (index * 10 < articles.length)
                i = index * 10
              else
                i = index;

              if (articles[i]) {
                  var prop = new Property();
                  prop.image = "https://mosaic03.ztat.net/vgs/media/catalog-lg/" + articles[i].media[0].path;
                  prop.name = articles[i].name.split(" ", 1);
                  prop.brand_name = articles[i].brand_name;

                  if (articles[i].price.promotional != articles[i].price.original) {
                    prop.price = "Price: " + articles[i].price.promotional + " was " + articles[i].price.original;
                  } else {
                    prop.price = "Price: " + articles[i].price.promotional;
                  }

                  prop.shortUrl = 'https://en.zalando.de/' + articles[i].url_key + '.html';
                  prop.product_group = articles[i].product_group;
                  propertyArray.push(prop);
              }
            }
            userMap[senderID] = new User();
            // client.hmset(senderID, JSON.stringify(new User()));
            sendZalandoResponseMessage(senderID, propertyArray);
            console.log('Response called');
          } else if(articles.hasOwnProperty('greeting')) {
              console.log('greeting called');
              sendGenericMessage(senderID);
              user.containsGreeting = 'true';
              console.log('processing wit response..');
              processWitRespone(senderID, articles, user);
              // this.setTimeout(function() { echoMessage(senderID, 'Please type the location you are looking for rent/buy property: flats in powai mumbai');}, 2000);
          } else {
              console.log('Zalando response less that 5. Couldnt process.');
              echoMessage(senderID, "Zalando response less that 5. Couldnt process.");
          }
      }
      return;
    });
}

function sendZalandoResponseMessage(recipientId, propertyArray) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          image_aspect_ratio: "square",
          elements: [{
            title: propertyArray[0].name + " by " + propertyArray[0].brand_name,
            subtitle: propertyArray[0].price,
            //item_url: propertyArray[0].shortUrl,
            image_url: propertyArray[0].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[0].shortUrl,
              title: "Buy Now"
            }]
          },
          {
            title: propertyArray[1].name + " by " + propertyArray[1].brand_name,
            subtitle: propertyArray[1].price,
            //item_url: propertyArray[1].shortUrl,
            image_url: propertyArray[1].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[1].shortUrl,
              title: "Buy Now"
            }]
          },
          {
            title: propertyArray[2].name + " by " + propertyArray[2].brand_name,
            subtitle: propertyArray[2].price,
            //item_url: propertyArray[2].shortUrl,
            image_url: propertyArray[2].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[2].shortUrl,
              title: "Buy Now"
            }]
          },
          {
            title: propertyArray[3].name + " by " + propertyArray[3].brand_name,
            subtitle: propertyArray[3].price,
            //item_url: propertyArray[3].shortUrl,
            image_url: propertyArray[3].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[3].shortUrl,
              title: "Buy Now"
            }]
          },
          {
            title: propertyArray[4].name + " by " + propertyArray[4].brand_name,
            subtitle: propertyArray[4].price,
            //item_url: propertyArray[4].shortUrl,
            image_url: propertyArray[4].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[4].shortUrl,
              title: "Buy Now"
            }],
          },
          {
            title: propertyArray[5].name + " by " + propertyArray[5].brand_name,
            subtitle: propertyArray[5].price,
            //item_url: propertyArray[5].shortUrl,
            image_url: propertyArray[5].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[5].shortUrl,
              title: "Buy Now"
            }]
          }]
        }
      }
    }
  };  

  sendTypingAction(recipientId, "typing_off");
  callSendAPI(messageData);
}

// ************* Util functions start ****** DO NOT DELETE *************** //
function sendGenericMessage(recipientId) {
  var fbResponse;

  request({
            url: 'https://graph.facebook.com/v2.6/'+ recipientId +'?fields=',
            qs: {access_token: PAGE_ACCESS_TOKEN},
            method: 'GET'
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending message: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }else{
                fbResponse = JSON.parse(body);
                var messageData = {
                  recipient: {
                      id: recipientId
                  },
                  message:{
                    attachment: {
                      type: "template",
                      payload: {
                        template_type: "button",
                        text: 'Hello ' + fbResponse.first_name + '.\nI am Zalando-AI-assistant.\nType in what you are looking for clothing or fashion and I\'ll try my best!',
                        buttons: [{
                            "type": "web_url",
                            "url": "https://en.zalando.de/",
                            "title": "Goto Zalando!"
                            }]
                    }
                  }
                }
              }
        sendTypingAction(recipientId, "typing_off");  
        callSendAPI(messageData);
            }
        });
}

function echoMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  sendTypingAction(recipientId, "typing_off");
  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  if (messageData && messageData.recipient.id === "794951570520699")
    return;
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

function sendTypingAction(recipientId, action) {
  var messageData = {
    "recipient":{
      "id": recipientId
    },
    "sender_action": action
  };  

  callSendAPI(messageData);
}

function sendQuickReply(recipientId, text, title1, payload1, title2, payload2, title3, payload3) {
  var messageData = {
    "recipient":{
      "id": recipientId
    },
    "message":{
      "text": text,
      "quick_replies":[
        {
          "content_type":"text",
          "title":title1,
          "payload":payload1
        },
        {
          "content_type":"text",
          "title":title2,
          "payload":payload2
        },
        {
          "content_type":"text",
          "title":title3,
          "payload":payload3
        }
      ]
    }
  }

  callSendAPI(messageData);
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  sendTypingAction(senderID, "typing_on");

  // The 'payload' param is a developer-defined field which is set in a postback button for Structured Messages. 
  var payload = event.postback.payload;
  // console.log("Received postback for user %d and page %d with payload '%s' at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to let them know it was successful
  if (payload.toString().toLowerCase() === ("plan")) {
  sendPlansMessage(senderID);
  } else if (payload.toString().toLowerCase() === ("freedom")) {
    messageText = "Set yourself free and get more owner contacts.";
    echoMessage(senderID, messageText);
  } else if (payload.toString().toLowerCase() === ("relax")) {
    messageText = "Sit back and relax, get a personal assistant to find a house.";
    echoMessage(senderID, messageText);
  } else if (payload.toString().toLowerCase() === ("assure")) {
    messageText = "Guaranteed home solutions with a personal assistant.";
    echoMessage(senderID, messageText);
  } else if (payload.toString().toLowerCase() === ("rent")) {
      if (!userMap.hasOwnProperty(senderID)) {
        console.error('Adding new user to session: ' + senderID);
        var user = new User();
        user.intent = 'rent';
        userMap[senderID] = user;
        //  client.hmset(senderID, JSON.stringify(user));
        //  client.expire(senderID, 900);
      }
      var user = userMap[senderID];
      /*  client.hgetall(senderID, function(err, object) {
          user = JSON.parse(object) ;
          }); */
      user.intent = 'rent';
      user.isSearchReq = 'true';
      // makeWitCall('rent', senderID);
      searchNobroker(user, senderID);
  } else if (payload.toString().toLowerCase() === ("buy")) {
      if (!userMap.hasOwnProperty(senderID)) {
        console.error('Adding new user to session: ' + senderID);
        userMap[senderID] = new User();
        //  client.hmset(senderID, JSON.stringify(user));
        //  client.expire(senderID, 900);
      }
      var user = userMap[senderID];
      /*  client.hgetall(senderID, function(err, object) {
            user = JSON.parse(object) ;
          });
      */
      user.intent = 'buy';
      user.isSearchReq = 'true';
      searchNobroker(user, senderID);
  } else if(payload.toString().toLowerCase() === ("reset")){
    // userMap[senderID] = new User();
    delete userMap[senderID];
    // client.hmset(senderID, JSON.stringify(new User()));
    echoMessage(senderID, "Reset successful!");
    return;
  } else if(payload.toString().toLowerCase().length === 4 && payload.toString().indexOf('BHK') > -1){
    if (!userMap.hasOwnProperty(senderID)) {
        console.error('Adding new user to session: ' + senderID);
        userMap[senderID] = new User();
        //  client.hmset(senderID, JSON.stringify(user));
        //  client.expire(senderID, 900);
    }
    var user = userMap[senderID];
    /*  client.hgetall(senderID, function(err, object) {
          user = JSON.parse(object) ;
          });
    */
    user.bhk = payload.toString().charAt(3);
    user.isSearchReq = 'true';
    searchNobroker(user, senderID);
    return;
  } else {
    echoMessage(senderID, "Sorry, didnt understand.");
  }
}

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});