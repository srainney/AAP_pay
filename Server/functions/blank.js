exports.handler = async (context, event, callback) => {


  // Add CORS handling headers
  const twilioResponse = new Twilio.Response();

  twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
  twilioResponse.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  twilioResponse.appendHeader("Content-Type", "application/json");

  try {
    twilioResponse.setBody("Something");
    return callback(null, twilioResponse);
  } catch (error) {
    twilioResponse.setStatusCode(400);
    return callback(twilioResponse.setBody(`Error doing something: ${error}`));
  }
};
