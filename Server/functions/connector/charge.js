/* This is just a mock connector to handle Twilio Connector sending card details to it and returning a token 

This is what will be received as the JSON Body

 }
 "cardnumber" : "4111111111111111",
 "cvv":"123",
 "expiry_month":"08",
 "expiry_year":"2022",
 "description":"pizza",
 "amount":"10.0",
 "currency_code":"USD",
 "postal_code":"94111"
}

and this is what the response should be for a token sent back

{
"charge_id":"ch_54f5f89e649a4ffe9f136010188ee80e",
"error_code":null,
"error_message":null
}

*/




exports.handler = async (context, event, callback) => {

  console.log(`MOCK CHARGE ####################### ${JSON.stringify(event, null, 4)}`);

  // Add CORS handling headers. TODO: Remove for production deployment
  const twilioResponse = new Twilio.Response();

  twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
  twilioResponse.appendHeader("Access-Control-Allow-Methods", "GET, POST,OPTIONS");
  twilioResponse.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  twilioResponse.appendHeader("Content-Type", "application/json");


  const gatewayResponse = {
    "charge_id": "ch_54f5f89e649a4ffe9f136010188ee80e",
    "error_code": null,
    "error_message": null
  }

  try {
    twilioResponse.setBody(gatewayResponse);
    return callback(null, twilioResponse);
  } catch (error) {
    twilioResponse.setStatusCode(400);
    return callback(twilioResponse.setBody(`Error with Mock tokenize - {error}`));
  }
};
