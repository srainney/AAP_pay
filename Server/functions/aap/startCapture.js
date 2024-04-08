/* 
This function allows the Client to start a payment session for a particular Call SID passed as part of the UUI
The first thing to check is if there is actually an active call for the callSid. This is in effect the security mechanism to limit who can call this function
*/
exports.handler = async (context, event, callback) => {

  console.log("Server startCapture event: ", JSON.stringify(event, null, 4));

  // Get a reference to the Twilio REST helper library
  const twilioClient = context.getTwilioClient();

  // Check if there is a call in progress for this callSid
  const callResource = await twilioClient.calls(event.callSid).fetch();
  if (callResource.status !== 'in-progress') {
    return callback(`startCapture error: Call not in progress for ${event.callSid}`, null);
  }

  const sessionData = {
    idempotencyKey: event.callSid + Date.now().toString(),
    statusCallback: "/paySyncUpdate",
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
    return callback(null, paymentSession);
  } catch (error) {
    return callback(`Error with StartCapture for callSID: ${event.callSid} - ${error}`, null);
  }
};
