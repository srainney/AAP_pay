/**
 * This is the outbound to PSTN voice handler that routes the call from the Customer's SIP Domain to a PSTN destination.
 * The PSTN side call SID is written into a Sync map as reference, so Pay can be attached.
 *
 * In this particular case, the SIP Domain needs to send a UUI in the SIP header and we extract it as "SipHeader_User-to-User". See https://www.twilio.com/docs/voice/api/sending-sip#uui-user-to-user-information-header
 * Once the call is connected, we call the StatusCallback to write the UUI & callSID in the UUI sync map.
 * 
 */
exports.handler = async (context, event, callback) => {

  // Add CORS handling headers
  const twilioResponse = new Twilio.Response();

  twilioResponse.appendHeader("Access-Control-Allow-Origin", "*");
  twilioResponse.appendHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  twilioResponse.appendHeader("Content-Type", "application/json");

  const voiceResponse = new Twilio.twiml.VoiceResponse();

  let to = event.To.match(/^sip:((\+)?[0-9]+)@(.*)/)[1];  // Extract the number from the SIP URI
  let from = event.From.match(/^sip:((\+)?[0-9]+)@(.*)/)[1]; // Extract the number from the SIP URI

  // Extract the SIP side UUI reference
  const UUI = event["SipHeader_User-to-User"] || Date.now();
  console.log(`OutboundHandler: UUI: ####${UUI}####`);

  try {
    console.info(`Dialing ${to} with Caller ID ${from} for Call SID: ${event.CallSid} with UUI ${UUI}`);
    const dial = voiceResponse.dial({ callerId: from });
    dial.number(
      {
        // Only update Sync when call is answered
        statusCallbackEvent: 'answered',
        statusCallback: `https://des.au.ngrok.io/sync/uuiSyncUpdate?CallDirection=toPSTN&UUI=${UUI}`,
        statusCallbackMethod: 'POST'
      },
      to);

    twilioResponse.setBody(voiceResponse);
    return callback(null, twilioResponse);
  } catch (error) {
    twilioResponse.setStatusCode(400);
    return callback(twilioResponse.setBody(`Error with callToPSTN: ${error}`));
  }
};
