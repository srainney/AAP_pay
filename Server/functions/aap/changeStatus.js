exports.handler = async (context, event, callback) => {

  // Add CORS handling headers. TODO: Remove for production deployment
  const twilioResponse = new Twilio.Response();

  twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
  twilioResponse.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  twilioResponse.appendHeader("Content-Type", "application/json");


  // Get a reference to the Twilio REST helper library
  const twilioClient = context.getTwilioClient();

  // Check if there is a call in progress for this callSid
  const callResource = await twilioClient.calls(event.callSid).fetch();
  if (callResource.status !== 'in-progress') {
    return callback(`startCapture error: Call not in progress for ${event.callSid}`);
  }

  try {
    const paymentSession = twilioClient.calls(event.callSid).payments(event.paymentSid).update({
      status: event.status,
      idempotencyKey: event.callSid + Date.now().toString(),
      // statusCallback: "/sync/paySyncUpdate",
      statusCallback: context.SERVER_URL + "/sync/paySyncUpdate",
    });

    twilioResponse.setBody(paymentSession.sid);
    return callback(null, twilioResponse); // Pay SID
  } catch (error) {
    twilioResponse.setStatusCode(400);
    return callback(twilioResponse.setBody(`Error with changeStatus for callSID: ${event.callSid} - {error}`));
  }
};
