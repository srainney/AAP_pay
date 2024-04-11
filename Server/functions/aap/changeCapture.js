exports.handler = async (context, event, callback) => {

  // Get a reference to the Twilio REST helper library
  const twilioClient = context.getTwilioClient();

  // Check if there is a call in progress for this callSid
  const callResource = await twilioClient.calls(event.callSid).fetch();
  if (callResource.status !== 'in-progress') {
    return callback(`startCapture error: Call not in progress for ${event.callSid}`);
  }

  try {
    const paymentSession = twilioClient.calls(event.callSid).payments(event.paymentSid).update({
      capture: event.captureType,
      idempotencyKey: event.callSid + Date.now().toString(),
      statusCallback: "/paySyncUpdate",
    });
    return callback(paymentSession.sid, null);   // Pay SID
  } catch (error) {
    return callback(null, `Error with changeType for callSID: ${event.callSid} - {error}`);
  }
};
