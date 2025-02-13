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
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    response.sendStatus(200);
  }
});

//var PAGE_ACCESS_TOKEN = "EAAEHFebMi9sBAAdNZAMrgsmKVrGm2rVu7oPzlkr2cb2McHYz0ccENdcFquaVtNKghYG1tWZBR8LZCJCzmTzu9tyGaZCZCj58iyg9vncvZBEQzsfPgZCzk2YsCjv002d3NeXaRZBKoIS30wnB5EuqxZBeNpk4oI4wiMtE2T9fZCFUblZBQZDZD";
var PAGE_ACCESS_TOKEN = "EAAikXHKbMcEBABFDhRdVTVHrxsX3oHbjZANfE2zwwlJem71wT9RZAGnsfNw6Dti5QAOCKaU8AMjMZBog2J7l7xqaGtZCThrzpdaMVag4fOaXrrLshDDvSYbcHoRIX4LHOENQeQjEv9vg1EAujIbbtT8ffvmrMcobq2z71UuCMAZDZD";

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

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // if (messageText.toLowerCase().indexOf("hi") > -1 || messageText.toLowerCase().indexOf("hello") > -1
    //     || messageText.toLowerCase().indexOf("hey") > -1) {
    //   sendGenericMessage(senderID);
    //   return;
    // }

    if (messageText.toLowerCase().indexOf("complain") > -1 || messageText.toLowerCase().indexOf("refund") > -1
          || messageText.toLowerCase().indexOf("pathetic") > -1 || messageText.toLowerCase().indexOf("frod") > -1) {
      echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly...");
      return;
    }

    if (messageText.toLowerCase().indexOf("thnk") > -1 || messageText.toLowerCase().indexOf("thank") > -1 && messageText.length < 20) {
      echoMessage(senderID, "Happy to help!");
      return;
    }

    callZalando(messageText, senderID);
    return;

  } else if (messageAttachments) {
    echoMessage(senderID, "Message with attachments received");
  }
}

function callZalando(messageText, senderID) {
    if (senderID === '794951570520699')
      return;
    queryString = encodeURIComponent(messageText);
    witUrl = 'https://en.zalando.de/api/catalog/articles?sort=popularity&query=' + queryString;
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
            var count = 0;

            for (var i=0; count < 6; i++) {
              if (articles[i]) {
                  var prop = new Property();
                  prop.image = "https://mosaic03.ztat.net/vgs/media/catalog-lg/" + articles[i].media[0].path;
                  prop.name = articles[i].name.split(" ", 1);
                  prop.brand_name = articles[i].brand_name;
                  prop.price = "Price: " + articles[i].price.promotional;
                  prop.shortUrl = 'https://en.zalando.de/' + articles[i].url_key + '.html';
                  prop.product_group = articles[i].product_group;
                  count++;
                  propertyArray.push(prop);
              }
            }
              // userMap[senderID] = new User();
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
              console.log('processing wit response..');
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

function makeWitCall(messageText, senderID) {
    if (senderID === '794951570520699')
      return;
    queryString = encodeURIComponent(messageText);
    witUrl = 'https://api.wit.ai/message?v=20160721&q=' + queryString;
    console.log('senderID: ' + senderID);
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
        this.setTimeout(function() { sendPlansMessage(senderID); }, 3000);
      }
      else {
          var jsonResponse = JSON.parse(body);
          var results = jsonResponse.entities;
          console.log('wit results received');
          
            var user = userMap[senderID];
            /* client.hgetall(senderID, function(err, object) {
              user = JSON.parse(object) ;
            }); */

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
          } else if(results.hasOwnProperty('intent')) {
              user.intent = results.intent[0].value;
              if (user.intent.toString() === 'sell' || user.intent.toString() === 'post') {
                userMap[senderID] = user;
                sendPostYourPropertyMessage(senderID);
                return;
              }
              processWitRespone(senderID, results, user);
          } else {
              console.log('processing wit response..');
              processWitRespone(senderID, results, user);
          }
      }
      return;
    });
}

function processWitRespone(senderID, results, user) {
  var map = {};
  map['intent'] = 0;
  map['location'] = 0;
  map['bhk'] = 0;
  map['minrent'] = 0;
  map['maxrent'] = 0;
  map['swimmingPool'] = 0;

  user.asked = 'false';
  user.isSearchReq = 'false';

  if(results.hasOwnProperty('no_of_bedrooms')) {
    user.bhk = results.no_of_bedrooms[0].value.match(/\d+/)[0];
    user.isSearchReq = 'true';
    user.bhkAsked = 'true';
  }

  if(results.hasOwnProperty('maxrent')) {
    user.maxrent = parseInt(results.maxrent[0].value) * 1.2;
    user.isSearchReq = 'true';
    user.rentAsked = 'true';
  }

  if(results.hasOwnProperty('minrent')) {
    user.minrent = parseInt(results.minrent[0].value) * 0.8;
    user.isSearchReq = 'true';
    user.rentAsked = 'true';
  }

  if(results.hasOwnProperty('swimmingpool')) {
    user.swimmingPool = 1;
    user.isSearchReq = 'true';
  }

  if(results.hasOwnProperty('gym')) {
    user.gym = 1;
    user.isSearchReq = 'true';
  }

  if(results.hasOwnProperty('lift')) {
    user.lift = 1;
    user.isSearchReq = 'true';
  }

  if(results.hasOwnProperty('parking')){
      map['parking'] = results.parking[0].value;
      if (map['parking'].toLowerCase().indexOf("car") > -1) {
          map['parking'] = 'car';
      }
      user.parking = map['parking'];
      user.isSearchReq = 'true';
  }

  if(results.hasOwnProperty('leaseType')){
    map['leaseType'] = results.leaseType[0].value;
    if (map['leaseType'].toLowerCase().indexOf("family") > -1) {
      map['leaseType'] = 'family';
    }
    user.leaseType = map['leaseType'];
    user.isSearchReq = 'true';
  }

  if(results.hasOwnProperty('furnishing')){
    map['furnishing'] = results.furnishing[0].value;
    if (map['furnishing'].toLowerCase().indexOf("un") > -1) {
      user.furnishing = 'NOT_FURNISHED';
    } else if (map['furnishing'].toLowerCase().indexOf("semi") > -1) {
        user.furnishing = 'SEMI_FURNISHED';
    } else if (map['furnishing'].toLowerCase().indexOf("ful") > -1) {
        user.furnishing = 'FULLY_FURNISHED';
    }
    user.isSearchReq = 'true';
  }
          
  userMap[senderID] = user;
  //  client.hmset(senderID, JSON.stringify(user));
  //  client.expire(senderID, 900);

  if(results.hasOwnProperty('location')) {
    if (!user.hasOwnProperty('intent')) {
      user.intent = 'rent';
      // userMap[senderID] = user;
      //  client.hmset(senderID, JSON.stringify(user));
      //  client.expire(senderID, 900);
      // askIntent(senderID);
      // return;
    }
    map['location'] = results.location[0].value;
    console.log('User Loc by text: ' + map['location']);

    googleQueryString = encodeURIComponent(map['location']);

    googleUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?key=AIzaSyCwy2ETEJXPynpNXJggwjzsHxFcG3Il34o&input='
                  + googleQueryString;

    console.log('GoogleUrl: ' + googleUrl);
    var options = {
      uri: googleUrl,
      method: 'GET'
    }

    request(options, function(error, response, body) {
      if(error) {
        console.log(error);
        echoMessage(senderID, "Oops! I Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
        this.setTimeout(function() { sendPlansMessage(senderID); }, 3000);
      }
      else {
        var googleResponse = JSON.parse(body);
        var predictions = googleResponse.predictions;

        if (predictions && predictions.length > 0) {
          var place_id = predictions[0].place_id;
          console.log("Google PlaceId: " + place_id);
          user.location = place_id;
          userMap[senderID] = user;
          //  client.hmset(senderID, JSON.stringify(user));
          //  client.expire(senderID, 900);
          searchNobroker(user, senderID);
        } else {
          echoMessage(senderID, "Sorry, Unable to identify your location. Please try again.");
          return;
        }
      }
    });

  } else if (user.hasOwnProperty('location') && user.isSearchReq.toString() === 'true') {
    if (!user.hasOwnProperty('intent')) {
        user.intent = 'rent';
        // userMap[senderID] = user;
        //  client.hmset(senderID, JSON.stringify(user));
        //  client.expire(senderID, 900);
        // askIntent(senderID);
        // return;
    }
    searchNobroker(user, senderID);
  } else if (user.hasOwnProperty('containsGreeting')){
      if (user.containsGreeting.toString() === 'false') {
        // echoMessage(senderID, "Oops! I Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
        echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly...");
        return;
      } else if (user.containsGreeting.toString() === 'true'){
        return;
      }
  } else if (user.hasOwnProperty('isSearchReq') && user.isSearchReq.toString() === 'true') {
      echoMessage(senderID, "Please type the location you are looking for rent/buy property");
  }else {
    echoMessage(senderID, "Thanks for contacting. One of our executives will get in touch with you shortly...");
    // echoMessage(senderID, "Oops! I Could not understand that. Try something like: 2 bhk flat for rent btm layout bangalore.");
  }
}

function  searchNobroker(user, senderID) {
  if (!user.location) {
    echoMessage(senderID, "Please type the location you are looking for rent/buy property");
    return;
  }

  echoMessage(senderID, "Hang on, looking that up...");
  var searchURL;
  if (user.intent.toString().toLowerCase().indexOf("buy") > -1) {
    searchURL = 'http://www.nobroker.in/api/v1/property/sale/filter/region/';
  } else {
    searchURL = 'http://www.nobroker.in/api/v1/property/filter/region/';
  }

  searchURL = searchURL + user.location.trim();
  searchURL = searchURL + '?withPics=1&sharedAccomodation=0&pageNo=1&';

  if (user.bhk) {
    searchURL = searchURL + 'type=BHK' +user.bhk.trim() + '&'; 
  }
           
  if (user.maxrent) {
    if (user.hasOwnProperty('minrent')) {
      searchURL = searchURL + 'rent=' + user.minrent + ',' + user.maxrent + '&';
    } else {
        searchURL = searchURL + 'rent=' + parseInt(user.maxrent.toString().trim()) * 0.8  + ',' + user.maxrent + '&';
    }
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

  if (user.parking) {
    if (user.parking.toString().toLowerCase() === "car") {
      searchURL = searchURL + 'parking=FOUR_WHEELER&';
    } else {
        searchURL = searchURL + 'parking=TWO_WHEELER&';
    }
  }

  if (user.leaseType) {
    if (user.leaseType.toString().toLowerCase() === "family") {
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
      // setTimeout(sendPlansMessage(senderID), 3000);
      } else {
        sendPropertyResponse(JSON.parse(body), senderID, user);
        return;
      }
  });
}

var propertyArray = [];

function Property() {
};

function sendPropertyResponse(jsonResponse, senderID, user) {
  var count = 0;
  var data = jsonResponse.data;

  if (!data) {
    echoMessage(senderID, "Oops! something went wrong with your request. Please try sometime later");
    return 0;
  }

  if (data.length === 0) {
    echoMessage(senderID, 'We are unable to find premium properties matching your requirements');
    echoMessage(senderID, 'Visit www.nobroker.in for detailed results.');
    // setTimeout(sendPlansMessage(senderID), 1500);
    return 0;
  }

  var propertyArray = [];

  for (var i=0; count < 4; i++) {
    if (i > 100) {
      break;
    }
    if (data[i]) {
        var prop = new Property();
        prop.city = data[i].city;
        prop.localityId = data[i].localityId;
        prop.nbLocality = data[i].nbLocality;
        prop.bhk = data[i].type.toString().slice(-1);;
        prop.locality = data[i].locality;
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
        // prop.shortUrl = data[i].shortUrl;
        prop.shortUrl = 'http://www.nobroker.in/' + data[i].detailUrl;
        if (!prop.shortUrl || prop.shortUrl === 'undefined' || prop.shortUrl === null) {
          continue;
        }
        if (count == 0) {
          if (user.intent.toString().indexOf('rent') > -1) {
            prop.url = 'http://www.nobroker.in/property/rent/' + data[i].city + '/' + data[i].nbLocality + '?nbPlace=' + data[i].localityId;
          } else {
            prop.url = 'http://www.nobroker.in/property/sale/' + data[i].city + '/' + data[i].nbLocality + '?nbPlace=' + data[i].localityId;
          }
        }

        count++;
        propertyArray.push(prop);
    }
  }

  if (propertyArray.length > 3) {
      sendPropertiesMessage(senderID, propertyArray);

      if (user.asked === 'false' && !user.bhkAsked) {
        user.bhkAsked = 'true';
        user.asked = 'true';
        
        this.setTimeout(function() { sendQuickReply(senderID, "Are you looking for any specific number of bhk / bedrooms?",
          '1 BHK', 'BHK1', '2 BHK', 'BHK2', '3 BHK', 'BHK3'); }, 6000);
        // this.setTimeout(function() { echoMessage(senderID, "Are you looking for any specific number of bhk / bedrooms?"); }, 6000);
        // this.setTimeout(function() { echoMessage(senderID, "You can always change search location. Just type-in new location."); }, 8000);
      }

      if (user.asked === 'false' && !user.rentAsked) {
        user.rentAsked = 'true';
        user.asked = 'true';
        this.setTimeout(function() { echoMessage(senderID, "Are you looking in specific price range? Like 15000 - 20000?"); }, 6000);
        this.setTimeout(function() { echoMessage(senderID, "You can always change search location. Just type-in new location."); }, 8000);
      }
      userMap[senderID] = user;  
      //  client.hmset(senderID, JSON.stringify(user));
      //  client.expire(senderID, 900);
  } else {
      echoMessage(senderID, 'We are unable to find premium properties matching your requirements');
    echoMessage(senderID, 'Visit www.nobroker.in for detailed results.');
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
            title: propertyArray[0].bhk + " BHK in " + propertyArray[0].locality.split(',')[0],
            subtitle: "Rent: " + propertyArray[0].rent + ".",
            item_url: propertyArray[0].shortUrl,
            image_url: propertyArray[0].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[0].shortUrl,
              title: "View Property"
            }]
          },
          {
            title: propertyArray[1].bhk + " BHK in " + propertyArray[1].locality.split(',')[0],
            subtitle: "Rent: " + propertyArray[1].rent + ".",
            item_url: propertyArray[1].shortUrl,
            image_url: propertyArray[1].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[1].shortUrl,
              title: "View Property"
            }]
          },
          {
            title: propertyArray[2].bhk + " BHK in " + propertyArray[2].locality.split(',')[0],
            subtitle: "Rent: " + propertyArray[2].rent + ".",
            item_url: propertyArray[2].shortUrl,
            image_url: propertyArray[2].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[2].shortUrl,
              title: "View Property"
            }]
          },
          {
            title: propertyArray[3].bhk + " BHK in " + propertyArray[3].locality.split(',')[0],
            subtitle: "Rent: " + propertyArray[3].rent + ".",
            item_url: propertyArray[3].shortUrl,
            image_url: propertyArray[3].image,
            buttons: [{
              type: "web_url",
              url: propertyArray[3].shortUrl,
              title: "View Property"
            }]
          },
          {
            title: 'See More',
            // subtitle: propertyArray[3].title + ". Rent: " + propertyArray[3].rent + ". \nDeposit: " + propertyArray[3].deposit,
            // item_url: propertyArray[3].shortUrl,
            image_url: "https://lh3.googleusercontent.com/3V4ulw7nvRC0ZyteV2vkaJDqyiq-PHNcijWL9CaX75Aqrctfws5pD3I6FQyhsZkmJg=w300",
            buttons: [{
              type: "web_url",
              url: propertyArray[0].url,
              title: "Show More Properties"
            }]
          }]
        }
      }
    }
  };  

  sendTypingAction(recipientId, "typing_off");
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
                        text: 'Hello ' + fbResponse.first_name + '.\nI am NoBroker AI-assistant to help you save brokerage.\nPlease type the location you are looking to rent/buy property.',
                        buttons: [{
                            "type": "web_url",
                            "url": "http://www.nobroker.in/tenant/plans",
                            "title": "Take me to Nobroker"
                            }, {
                            "type": "postback",
                            "title": "Nobroker Home Plans",
                            "payload": "plan"
                          }, {
                            "type": "web_url",
                            "title": "Post your property",
                            "url": "http://www.nobroker.in/list-your-property-for-rent-sale"
                          }
                        ]
                    }
                  }
                }
              }
        sendTypingAction(recipientId, "typing_off");  
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

  sendTypingAction(recipientId, "typing_off");
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

function sendPostYourPropertyMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: 'You can post your property by clicking on below link:',
          buttons: [{
            "type": "web_url",
            "title": "Post your property",
            "url": "http://www.nobroker.in/list-your-property-for-rent-sale"
          }]
        }
      }
    }
  }
  sendTypingAction(recipientId, "typing_off");  
  callSendAPI(messageData);
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