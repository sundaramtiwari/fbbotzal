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
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          // receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          // receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    response.sendStatus(200);
  }
});

var PAGE_ACCESS_TOKEN = "EAAEHFebMi9sBAAdNZAMrgsmKVrGm2rVu7oPzlkr2cb2McHYz0ccENdcFquaVtNKghYG1tWZBR8LZCJCzmTzu9tyGaZCZCj58iyg9vncvZBEQzsfPgZCzk2YsCjv002d3NeXaRZBKoIS30wnB5EuqxZBeNpk4oI4wiMtE2T9fZCFUblZBQZDZD";

function User(){
}

var userMap = {};

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  // console.log("Received message for user %d and page %d at %d", 
  //  senderID, recipientID, timeOfMessage);

  if (Object.keys(userMap).length > 100) {
    userMap.splice(-1,1);
  }

  if (!userMap.hasOwnProperty(senderID)) {
    console.error('Adding new user to session: ' + senderID);
    userMap[senderID] = new User();
  } else {
    console.error('User already in session: ' + userMap[senderID]);
  }

  var messageId = message.mid;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

  	if (messageText.toLowerCase().indexOf("hi") > -1 || messageText.toLowerCase().indexOf("hello") > -1
        || messageText.toLowerCase().indexOf("hey") > -1 || messageText.toLowerCase().indexOf("up") > -1) {
  		sendGenericMessage(senderID);
  		return;
  	}

    makeWitCall(messageText, senderID);

  } else if (messageAttachments) {
    echoMessage(senderID, "Message with attachment received");
  }
}

function makeWitCall(messageText, senderID) {
    queryString = encodeURIComponent(messageText);
    witUrl = 'https://api.wit.ai/message?v=20160721&q=' + queryString;
    console.log('Wit URL: ' + witUrl);

    var options = {
      uri: witUrl,
      method: 'GET',
      headers: {
          'Authorization': 'Bearer IQ7WHYYVOGCDSAWYXIXDBSGDHHDY4QA5',
        }
    }

    request(options, function(error, response, body) {
      if(error) {
        echoMessage(senderID, "Oops! AI Engine failed to understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
        setTimeout(sendPlansMessage(senderID), 1500);
      }
      else {
          processWitRespone(senderID, body);
      }
        return;
    });
}

function processWitRespone(senderID, body) {
  var map = {};
  map['intent'] = 0;
  map['location'] = 0;
  map['bhk'] = 0;
  map['minrent'] = 0;
  map['maxrent'] = 0;
  map['swimmingPool'] = 0;

  var jsonResponse = JSON.parse(body);
  var results = jsonResponse.entities;
  var user = userMap[senderID];

  if (!results) {
    echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly...");
  }

  if(results.hasOwnProperty('reset')){
    userMap[senderID] = new User();
    resetText = "Session reset for userId: " + senderID;
    echoMessage(senderID, resetText);
    return;
  }

  if(results.hasOwnProperty('location')) {
    map['location'] = results.location[0].value;
    console.log('User Loc by text: ' + map['location']);

    googleUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?key=AIzaSyCwy2ETEJXPynpNXJggwjzsHxFcG3Il34o&input='
                  + map['location'];

    console.log('GoogleUrl: ' + googleUrl);
    var options = {
      uri: googleUrl,
      method: 'GET'
    }

    request(options, function(error, response, body) {
      if(error) {
        console.log(error);
        echoMessage(senderID, "Oops! Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
        setTimeout(sendPlansMessage(senderID), 1500);
      }
      else {
        var googleResponse = JSON.parse(body);
        predictions = googleResponse.predictions;

        if (predictions && predictions.length > 0) {
          var place_id = predictions[0].place_id;
          // searchNobroker(place_id, results, user, map, senderID);
          var existing_intent = user.intent;
          userMap[senderID] = new User();
          user = userMap[senderID];
          if (existing_intent) {
            user.intent = existing_intent;
          }
          console.log("Session reset for userId: " + senderID);

          user.location = place_id;

          if(results.hasOwnProperty('no_of_bedrooms')){
            map['bhk'] = results.no_of_bedrooms[0].value.match(/\d+/)[0];
            user.bhk = map['bhk'];
            console.log('bhk: ' + map['bhk']);
          }

          if(results.hasOwnProperty('maxrent')){
           map['maxrent'] = results.maxrent[0].value;
           user.maxrent = map['maxrent'];
           console.log('maxrent: ' + map['maxrent'].value);
          }

          if(results.hasOwnProperty('minrent')){
            map['minrent'] = results.minrent[0].value;
            user.minrent = map['minrent'];
            console.log('minrent: ' + map['minrent'].value);
          }

          if(results.hasOwnProperty('swimmingpool')){
           map['swimmingPool'] = 1;
           user.swimmingPool = map['swimmingPool'];
           console.log('Swimming pool required');
          }

          if(results.hasOwnProperty('gym')){
           map['gym'] = 1;
           user.gym = map['gym'];
           console.log('Gym required');
          }

          if(results.hasOwnProperty('lift')){
           map['lift'] = 1;
           user.lift = map['lift'];
           console.log('lift required');
          }

          if(results.hasOwnProperty('parking')){
            map['parking'] = results.parking[0].value;
            if (map['parking'].toLowerCase().indexOf("car") > -1) {
              map['parking'] = 'car';
            }
            user.parking = map['parking'];
           console.log('parking required');
          }

          if(results.hasOwnProperty('leaseType')){
            map['leaseType'] = results.leaseType[0].value;
            if (map['leaseType'].toLowerCase().indexOf("family") > -1) {
              map['leaseType'] = 'family';
            }
            user.leaseType = map['leaseType'];
           console.log('leaseType required');
          }

          if(results.hasOwnProperty('furnishing')){
            map['furnishing'] = results.furnishing[0].value;
            if (map['furnishing'].toLowerCase().indexOf("un") > -1) {
              map['furnishing'] = 'NOT_FURNISHED';
            } else if (map['furnishing'].toLowerCase().indexOf("semi") > -1) {
              map['furnishing'] = 'SEMI_FURNISHED';
            } else if (map['furnishing'].toLowerCase().indexOf("ful") > -1) {
              map['furnishing'] = 'FULLY_FURNISHED';
            }
            user.furnishing = map['furnishing'];
           console.log('furnishing required');
          }

          if(results.hasOwnProperty('intent')){
            map['intent'] = results.intent[0].value;
            user.intent = map['intent'];
          } else if (!user.hasOwnProperty('intent')) {
            askIntent(senderID);
            userMap[senderID] = user;
            return;
          }

          echoMessage(senderID, "Just a sec, I’m looking that up...");
          
          userMap[senderID] = user;
          
          var bhk, maxrent, parking, leaseType;

          if (user.hasOwnProperty('bhk')) {
            bhk = user.bhk;
          }

          if (user.hasOwnProperty('maxrent')) {
            maxrent = user.maxrent;
          }

          if (user.hasOwnProperty('swimmingPool')) {
            swimmingPool = user.swimmingPool;
          }

          if (user.hasOwnProperty('parking')) {
            parking = user.parking;
          }

          if (user.hasOwnProperty('leaseType')) {
            leaseType = user.leaseType;
          }
          
          var searchURL;
          if (user.intent.toString().toLowerCase().indexOf("buy") > -1) {
            searchURL = 'http://www.nobroker.in/api/v1/property/sale/filter/region/';
          } else {
            searchURL = 'http://www.nobroker.in/api/v1/property/filter/region/';
          }
          searchURL = searchURL + place_id;
          searchURL = searchURL + '?withPics=1&sharedAccomodation=0&pageNo=1&';

          if (bhk) {
            searchURL = searchURL + 'type=BHK' +bhk.trim() + '&'; 
          }
           
          if (maxrent) {
            if (user.hasOwnProperty('minrent')) {
              minrent = user.minrent.toString();
            } else {
              minrent = '0';
            }
            searchURL = searchURL + 'rent=' + minrent + ',' + maxrent.trim() + '&'; 
          }

          if (swimmingPool === 1) {
            searchURL = searchURL + 'swimmingPool=1&';
          }

          if (user.hasOwnProperty('gym')) {
            searchURL = searchURL + 'gym=1&';
          }

          if (user.hasOwnProperty('lift')) {
            searchURL = searchURL + 'lift=1&';
          }

          if (user.hasOwnProperty('furnishing')) {
            searchURL = searchURL + 'furnishing=' + user.furnishing + '&';
          }

          if (parking) {
            if (parking.toString().toLowerCase() === "car") {
              searchURL = searchURL + 'parking=FOUR_WHEELER&';
            } else {
              searchURL = searchURL + 'parking=TWO_WHEELER&';
            }
          }

          if (leaseType) {
            if (leaseType.toString().toLowerCase() === "family") {
              searchURL = searchURL + 'leaseType=FAMILY&';
            } else {
              searchURL = searchURL + 'parking=BACHELOR&';
            }
          }

          console.log("NoBroker Search URL: " + searchURL);
          
          options = {
            uri: searchURL,
            method: 'GET',
          }

          request(options, function(error, response, body) {
            if(error) {
              console.error(error);
              echoMessage(senderID, "Oops! Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
              setTimeout(sendPlansMessage(senderID), 1500);
            } else {
              sendPropertyResponse(JSON.parse(body), senderID);
              return;
            }
          });
        } else {
          echoMessage(senderID, "Oops! Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore."); 
        }
      }
    });

  } else if (user.hasOwnProperty('location')) {
        console.error('User Loc by session: ' + user.location);

        if(results.hasOwnProperty('no_of_bedrooms')){
          map['bhk'] = results.no_of_bedrooms[0].value.match(/\d+/)[0];
          user.bhk = map['bhk'];
          console.log('bhk: ' + map['bhk']);
        }

        if(results.hasOwnProperty('maxrent')){
         map['maxrent'] = results.maxrent[0].value;
         user.maxrent = map['maxrent'];
         console.log('maxrent: ' + map['maxrent'].value);
        }

        if(results.hasOwnProperty('minrent')){
          map['minrent'] = results.minrent[0].value;
          user.minrent = map['minrent'];
          console.log('minrent: ' + map['minrent'].value);
        }

        if(results.hasOwnProperty('swimmingpool')){
         map['swimmingPool'] = 1;
         user.swimmingPool = map['swimmingPool'];
         console.log('Swimming pool required');
        }
        
        if(results.hasOwnProperty('gym')){
           map['gym'] = 1;
           user.gym = map['gym'];
           console.log('Gym required');
          }

          if(results.hasOwnProperty('lift')){
           map['lift'] = 1;
           user.lift = map['lift'];
           console.log('lift required');
          }

          if(results.hasOwnProperty('parking')){
            map['parking'] = results.parking[0].value;
            if (map['parking'].toLowerCase().indexOf("car") > -1) {
              map['parking'] = 'car';
            }
            user.parking = map['parking'];
           console.log('parking required');
          }

          if(results.hasOwnProperty('leaseType')){
            map['leaseType'] = results.leaseType[0].value;
            if (map['leaseType'].toLowerCase().indexOf("family") > -1) {
              map['leaseType'] = 'family';
            }
            user.leaseType = map['leaseType'];
           console.log('leaseType required');
          }

          if(results.hasOwnProperty('furnishing')){
            map['furnishing'] = results.furnishing[0].value;
            if (map['furnishing'].toLowerCase().indexOf("un") > -1) {
              map['furnishing'] = 'NOT_FURNISHED';
            } else if (map['furnishing'].toLowerCase().indexOf("semi") > -1) {
              map['furnishing'] = 'SEMI_FURNISHED';
            } else if (map['furnishing'].toLowerCase().indexOf("ful") > -1) {
              map['furnishing'] = 'FULLY_FURNISHED';
            }
            user.furnishing = map['furnishing'];
           console.log('furnishing required');
          }

        if(results.hasOwnProperty('intent')){
          map['intent'] = results.intent[0].value;
          user.intent = map['intent'];
        } else if (!user.hasOwnProperty('intent')) {
           askIntent(senderID);
           userMap[senderID] = user;
           return;
        }

        echoMessage(senderID, "Just a sec, I’m looking that up...");

        userMap[senderID] = user;
        
        var bhk, maxrent, swimmingPool, parking, leaseType;

        if (user.hasOwnProperty('bhk')) {
          bhk = user.bhk;
          console.log('Search query bhk: ' + bhk);
        }

        if (user.hasOwnProperty('maxrent')) {
          var maxrent = user.maxrent;
          console.log('Search query maxrent: ' + maxrent);
        }

        if (user.hasOwnProperty('swimmingPool')) {
          swimmingPool = user.swimmingPool;
          console.log('Search query swimmingPool: ' + swimmingPool);
        }

        if (user.hasOwnProperty('parking')) {
            parking = user.parking;
        }

        if (user.hasOwnProperty('leaseType')) {
          leaseType = user.leaseType;
        }

        var searchURL;
        if (user.intent) {
          if (user.intent.toString().toLowerCase().indexOf("buy") > -1) {
            searchURL = 'http://beta.nobroker.in/api/v1/property/sale/filter/region/';
          } else {
            searchURL = 'http://beta.nobroker.in/api/v1/property/filter/region/';
          }
        } else {
          searchURL = 'http://beta.nobroker.in/api/v1/property/filter/region/';
        }
        searchURL = searchURL + user.location;
        searchURL = searchURL + '?withPics=1&sharedAccomodation=0&pageNo=1&';

        console.log('Adding filters to search URL...');
        if (bhk) {
          searchURL = searchURL + 'type=BHK' + bhk.trim() + '&'; 
        }
         
        if (maxrent) {
          if (user.hasOwnProperty('minrent')) {
            minrent = user.minrent;
          } else {
            minrent = '0';
          }
          searchURL = searchURL + 'rent=' + minrent.trim() + ',' + maxrent.trim() + '&'; 
        }

        if (user.hasOwnProperty('swimmingPool')) {
          searchURL = searchURL + 'swimmingPool=1&';
        }

        if (user.hasOwnProperty('gym')) {
          searchURL = searchURL + 'gym=1&';
        }

        if (user.hasOwnProperty('lift')) {
          searchURL = searchURL + 'lift=1&';
        }

        if (user.hasOwnProperty('furnishing')) {
          searchURL = searchURL + 'furnishing=' + user.furnishing + '&';
        }

        if (parking) {
          if (parking.toString().toLowerCase() === "car") {
            searchURL = searchURL + 'parking=FOUR_WHEELER&';
          } else {
            searchURL = searchURL + 'parking=TWO_WHEELER&';
          }
        }

        if (leaseType) {
          if (leaseType.toString().toLowerCase() === ("family")) {
            searchURL = searchURL + 'leaseType=FAMILY&';
          } else {
            searchURL = searchURL + 'parking=BACHELOR&';
          }
        }

        console.log("NoBroker Search URL: " + searchURL);
        
        options = {
          uri: searchURL,
          method: 'GET',
        }

        request(options, function(error, response, body) {
          if(error) {
            console.error(error);
            echoMessage(senderID, "Oops! Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
            setTimeout(sendPlansMessage(senderID), 1500);
          } else {
            sendPropertyResponse(JSON.parse(body), senderID);
            return;
          }
        });      
  }
    else {
      echoMessage(senderID, "Sorry, Unable to understand. Our executives will get in touch with you shortly.");
      return;
  }
}

function searchNobroker(place_id, results, user, map, senderID) {
        user.location = place_id;

        if(results.hasOwnProperty('intent')){
          map['intent'] = results.intent[0].value;
          user.intent = map['intent'];
        }

        if(results.hasOwnProperty('no_of_bedrooms')){
          map['bhk'] = results.no_of_bedrooms[0].value.match(/\d+/)[0];
          user.bhk = map['bhk'];
          console.log('bhk: ' + map['bhk']);
        }

        if(results.hasOwnProperty('maxrent')){
         map['maxrent'] = results.maxrent[0].value;
         user.maxrent = map['maxrent'];
         console.log('maxrent: ' + map['maxrent'].value);
        }

        if(results.hasOwnProperty('minrent')){
          map['minrent'] = results.minrent[0].value;
          user.minrent = map['minrent'];
          console.log('minrent: ' + map['minrent'].value);
        }

        if(results.hasOwnProperty('swimmingpool')){
         map['swimmingPool'] = 1;
         user.swimmingPool = map['swimmingPool'];
         console.log('Swimming pool required');
        }
        
        userMap[senderID] = user;
        
        var bhk, maxrent, swimmingPool;

        if (user.hasOwnProperty('bhk')) {
          bhk = user.bhk;
        }

        if (user.hasOwnProperty('maxrent')) {
          var maxrent = user.maxrent;
        }

        if (user.hasOwnProperty('swimmingPool')) {
          var swimmingPool = user.swimmingPool;
        }
        
        var searchURL = 'http://www.nobroker.in/api/v1/property/filter/region/';
        searchURL = searchURL + place_id;
        searchURL = searchURL + '?sharedAccomodation=0&pageNo=1&';

        if (bhk) {
          searchURL = searchURL + 'type=BHK' +bhk.trim() + '&'; 
        }
         
        if (maxrent) {
          if (user.hasOwnProperty('minrent')) {
            minrent = user.minrent.toString();
          } else {
            minrent = '0';
          }
          searchURL = searchURL + 'rent=' + minrent + ',' + maxrent.trim() + '&'; 
        }

        if (swimmingPool === 1) {
          searchURL = searchURL + 'swimmingPool=1&';
        }

        console.log("NoBroker Search URL: " + searchURL);
        
        options = {
          uri: searchURL,
          method: 'GET',
        }

        request(options, function(error, response, body) {
          if(error) {
            console.error(error);
            echoMessage(senderID, "Oops! Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
            setTimeout(sendPlansMessage(senderID), 1500);
          } else {
            sendPropertyResponse(JSON.parse(body), senderID);
            return;
          }
        });
      
}

var propertyArray = [];

function Property() {
};

function sendPropertyResponse(jsonResponse, senderID) {
  var count = 0;
  var data = jsonResponse.data;

  if (!data) {
    echoMessage(senderID, "Hold on... something went wrong with your request. Try again sometime later");
    return 0;
  }

  if (data.length === 0) {
    echoMessage(senderID, "Oops! No matching properties found! \nTry our premium plans customized for your specific needs:");
    setTimeout(sendPlansMessage(senderID), 1500);
    return 0;
  }

  propertyArray = [];
  for (var i=0; count<4; i++) {
    if (i > 50) {
      break;
    }
    if (data[i]) {
        var prop = new Property();
        prop.title = data[i].title;
        prop.description = data[i].description;
        prop.rent = data[i].rent;
        prop.deposit = data[i].deposit;
        var photos = data[i].photos;
        if (photos.length > 0) {
          imageStr = photos[0].imagesMap.original;
          img = imageStr.split('_')[0] + '/';
          prop.image = 'http://d3snwcirvb4r88.cloudfront.net/images/' + img + imageStr;
        } else {
          continue;
        }
        prop.shortUrl = data[i].shortUrl;
        prop.detailUrl = 'http://www.nobroker.in/' + data[i].detailUrl;
        count++;
        propertyArray.push(prop);
    }
  }

  if (propertyArray.length > 3) {
    sendPropertiesMessage(senderID, propertyArray);
  } else {
    echoMessage(senderID, 'Sorry! No matching properties found. Type \'reset\' to reset your filters.');
  }
}

function sendPropertiesMessage(recipientId, propertyArray) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Recommended Property",
            subtitle: propertyArray[0].title + ". Rent: " + propertyArray[0].rent,
            item_url: propertyArray[0].shortUrl,
            image_url: propertyArray[0].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[0].detailUrl,
              title: "Contact"
            }, {
              type: "postback",
              title: "Read Here",
              payload: propertyArray[0].description,
            }]
          },
          {
            title: "Recommended Property",
            subtitle: propertyArray[1].title + ". Rent: " + propertyArray[1].rent,
            item_url: propertyArray[1].shortUrl,
            image_url: propertyArray[1].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[1].detailUrl,
              title: "Contact"
            }, {
              type: "postback",
              title: "Read Here",
              payload: propertyArray[1].description,
            }]
          },
          {
            title: "Recommended Property",
            subtitle: propertyArray[2].title + ". Rent: " + propertyArray[2].rent,
            item_url: propertyArray[2].shortUrl,
            image_url: propertyArray[2].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[2].detailUrl,
              title: "Contact"
            }, {
              type: "postback",
              title: "Read Here",
              payload: propertyArray[2].description,
            }]
          },
          {
            title: "Recommended Property",
            subtitle: propertyArray[3].title + ". Rent: " + propertyArray[3].rent,
            item_url: propertyArray[3].shortUrl,
            image_url: propertyArray[3].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[3].detailUrl,
              title: "Contact"
            }, {
              type: "postback",
              title: "Read Here",
              payload: propertyArray[3].description,
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

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
								    text: 'Dear ' + fbResponse.first_name + '.\nI am an AI-based assistant for Nobroker. Ask me things like: \'2 bhk flats in koramangala bangalore\'\n\n',
								    buttons: [{
								        "type": "web_url",
								        "url": "http://www.nobroker.in/tenant/plans",
								        "title": "Take me to Nobroker"
								        }, {
								        "type": "postback",
								        "title": "Buy or Rent property",
										    "payload": "plan"
								    }]
								}
							}
						}
				  }
				callSendAPI(messageData);
	          }
	      });
}

function askIntent(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
          type: "template",
          payload: {
          template_type: "button",
          text: 'Please select your preference: buy/rent',
          buttons: [{
          "type": "postback",
          "payload": "Buy",
          "title": "Buy"
          }, {
          "type": "postback",
          "title": "Rent",
          "payload": "Rent"
          }]
          }
          }
    }
  };  

  callSendAPI(messageData);
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

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
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

function sendOldGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function sendPlansMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Freedom Plan",
            subtitle: "Set yourself free and get more owner contacts",
            item_url: "http://www.nobroker.in/tenant/plans",
            image_url: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcSA7kPTdRq4JiOqF6i24scjHgMBUy1EBpzi1aBiI9WrP-QEOtJdAQ",
            buttons: [{
              type: "web_url",
              url: "http://www.nobroker.in/tenant/plans",
              title: "View on Web"
            }, {
              type: "postback",
              title: "Read Here",
              payload: "freedom",
            }],
          }, {
            title: "Relax Plan",
            subtitle: "Sit back and relax, get a personal assistant to find a house",
            item_url: "http://www.nobroker.in/tenant/plans",
            image_url: "http://paulstallard.me/wp-content/uploads/2015/07/relax-05.jpg",
            buttons: [{
              type: "web_url",
              url: "http://www.nobroker.in/tenant/plans",
              title: "View on Web"
            }, {
              type: "postback",
              title: "Read Here",
              payload: "relax",
            }], 
          }, {
            title: "Assure Plan",
            subtitle: "Guaranteed home solutions with a personal assistant",
            item_url: "http://www.nobroker.in/tenant/plans",
            image_url: "http://comps.gograph.com/100-percent-assured-stamp_gg55034019.jpg",
            buttons: [{
              type: "web_url",
              url: "http://www.nobroker.in/tenant/plans",
              title: "View on Web"
            }, {
              type: "postback",
              title: "Read Here",
              payload: "assure",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

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
      userMap[senderID] = new User();
    }
    var user = userMap[senderID];
    user.intent = 'rent';
    makeWitCall('rent', senderID)
  } else if (payload.toString().toLowerCase() === ("buy")) {
    if (!userMap.hasOwnProperty(senderID)) {
      console.error('Adding new user to session: ' + senderID);
      userMap[senderID] = new User();
    }
    var user = userMap[senderID];
    user.intent = 'buy';
    makeWitCall('buy', senderID)
  } 
  else {
  	echoMessage(senderID, payload);
  }
}

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});