/**
 * This is the outbound to PSTN voice handler that routes the call from the Customer's SIP Domain to a PSTN destination.
 * The PSTN side call SID is written into a Sync map as reference, so Pay can be attached.
 *
 * In this particular case, the SIP Domain needs to send a UUI in the SIP header and we extract it as "SipHeader_User-to-User". See https://www.twilio.com/docs/voice/api/sending-sip#uui-user-to-user-information-header
 * Once the call is connected, we call the StatusCallback to write the UUI & callSID in the UUI sync map.
 * 
 */
exports.handler = async (context, event, callback) => {

  console.info(`callToPSTN: Dialing ${event.To} with Caller ID ${event.From} for Call SID: ${event.CallSid} with UUI ${event.UUI}`);

  const voiceResponse = new Twilio.twiml.VoiceResponse();

  let to = event.To.match(/^sip:((\+)?[0-9]+)@(.*)/)[1];  // Extract the number from the SIP URI
  let from = event.From.match(/^sip:((\+)?[0-9]+)@(.*)/)[1]; // Extract the number from the SIP URI

  // Extract the SIP side UUI reference
  const UUI = event["SipHeader_User-to-User"] || Date.now();
  console.log(`OutboundHandler: UUI: ####${UUI}####`);

  try {
    console.info(`Dialing ${to} with Caller ID ${from} for Call SID: ${event.CallSid} with UUI ${UUI}`);
    const dial = voiceResponse.dial({ callerId: from });
    console.log(`Dialing {dial} ${dial}`);
    dial.number(
      {
        // Only update Sync when call is answered
        statusCallbackEvent: 'answered',
        statusCallback: context.SERVER_URL + `/sync/uuiSyncUpdate?CallDirection=toPSTN&UUI=${UUI}`,
        statusCallbackMethod: 'POST'
      },
      to);

    console.log(`Dial set up`);
    return callback(null, voiceResponse);
  } catch (error) {
    return callback(`Error with callToPSTN: ${error}`);
  }
};
