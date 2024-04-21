exports.handler = async (context, event, callback) => {

  // Add CORS handling headers. TODO: Remove for production deployment
  const twilioResponse = new Twilio.Response();

  twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
  twilioResponse.appendHeader("Access-Control-Allow-Methods", "GET, POST,OPTIONS");
  twilioResponse.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  twilioResponse.appendHeader("Content-Type", "application/json");

  // Get a reference to the Twilio REST helper library
  const twilioClient = context.getTwilioClient();

  // Check if there is a call in progress for this callSid
  const callResource = await twilioClient.calls(event.callSid).fetch();

  if (callResource.status !== 'in-progress') {
    return callback(`startCapture error: Call not in progress for ${event.callSid}`);
  }

  try {
    const paymentSession = await twilioClient.calls(event.callSid)
      .payments(event.paymentSid)
      .update({
        capture: event.captureType,
        idempotencyKey: event.callSid + Date.now().toString(),
        // statusCallback: "/sync/paySyncUpdate",
        statusCallback: context.SERVER_URL + "/sync/paySyncUpdate",
      });
    // console.log(`Change capture paymentSession: ${JSON.stringify(paymentSession, null, 4)}`);

    twilioResponse.setBody(paymentSession);

    console.log(`Changed capture type to ${event.captureType}`);

    return callback(null, twilioResponse); // Pay object
  } catch (error) {
    console.log(`Error with changeType for callSID: ${event.callSid} - ${error}`);
    twilioResponse.setStatusCode(400);
    return callback(twilioResponse.setBody(`Error with changeType for callSID: ${event.callSid} - {error}`));
  }
};
