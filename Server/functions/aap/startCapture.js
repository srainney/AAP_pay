/* 
This function allows the Client to start a payment session for a particular Call SID passed as part of the UUI
The first thing to check is if there is actually an active call for the callSid. This is in effect the security mechanism to limit who can call this function
*/
exports.handler = async (context, event, callback) => {

  console.log("Server startCapture");
  // console.log("Server startCapture event: ", JSON.stringify(event, null, 4));
  // Add CORS handling headers
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
    return callback(`startCapture error: Call not in progress for ${event.callSid}`, null);
  }

  const sessionData = {
    idempotencyKey: event.callSid + Date.now().toString(),
    // statusCallback: "/Server/functions/sync/paySyncUpdate",
    statusCallback: context.SERVER_URL + "/sync/paySyncUpdate",
    ...(event.chargeAmount === 0 ? { tokenType: event.tokenType } : {}),
    // tokenType: event.tokenType,
    chargeAmount: event.chargeAmount,
    currency: event.currency,
    paymentConnector: context.PAYMENT_CONNECTOR,
    securityCode: context.INCLUDE_CVC,
    postalCode: context.INCLUDE_POSTAL_CODE
  }

  console.log("Server startCapture sessionData: ", JSON.stringify(sessionData, null, 4));

  try {
    const paymentSession = await twilioClient.calls(event.callSid).payments.create(sessionData);
    twilioResponse.setBody(paymentSession);
    console.log("Server startCapture paymentSession: ", JSON.stringify(paymentSession, null, 4));
    return callback(null, twilioResponse);
  } catch (error) {
    twilioResponse.setStatusCode(400);
    return callback(twilioResponse.setBody(`Error with StartCapture for callSID: ${event.callSid} - ${error}`));
  }
};
