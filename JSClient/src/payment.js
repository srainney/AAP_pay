import { config } from 'dotenv';
config()


// import { config as env } from 'dotenv';
// const { parsed: envConfig } = env();
const { PUBLIC_SERVER_URL,
    PUBLIC_PAYMENT_CONNECTOR,
    PUBLIC_PAYMENT_CURRENCY,
    PUBLIC_PAYMENT_TOKEN_TYPE,
    PUBLIC_PAYMENT_CAPTURE_ORDER,
    PUBLIC_TWILIO_TOKEN } = process.env;

console.log("PUBLIC_SERVER_URL: ", PUBLIC_SERVER_URL, ", PUBLIC_PAYMENT_CONNECTOR: ", PUBLIC_PAYMENT_CONNECTOR, ", PUBLIC_PAYMENT_CURRENCY: ", PUBLIC_PAYMENT_CURRENCY, ", PUBLIC_PAYMENT_TOKEN_TYPE: ", PUBLIC_PAYMENT_TOKEN_TYPE, ", PUBLIC_PAYMENT_CAPTURE_ORDER: ", PUBLIC_PAYMENT_CAPTURE_ORDER);

// Twilio Sync Client
import { SyncClient } from "twilio-sync";

var pollTimer;
let captureOrder = PUBLIC_PAYMENT_CAPTURE_ORDER.split(",").map((item) => item.trim());
let startedCapturing = false;
let canSubmit = false;
let maskedPayData = {
    ExpirationDate: "-",
    PaymentCardNumber: "-",
    PaymentCardType: "-",
    Required: "payment-card-number,expiration-date,security-code",
    SecurityCode: "-",
};

// This function scans the received maskedPayData and performs a few operations:
// 1) Checks if the Required attribute is present
// 2) If the Required attribute is not present and the capture has started, it stops the polling
// 3) When the "required" string length is less than the captureOrder array length, it updates the captureOrder array, removing the first element and calling the next capture API
const scanMaskedPayData = async function () {
    console.log("scanMaskedPayData maskedPayData: ", maskedPayData);
    // If there is a required attribute, start capturing
    if (maskedPayData.Required) {
        // Set the capturing flag
        startedCapturing = true;

        console.log(
            "startedCapturing: ",
            startedCapturing,
            ", scanMaskedPayData maskedPayData.Required: ",
            maskedPayData.Required,
            ", maskedPayData.Required.length: ",
            maskedPayData.Required.length
        );

        // Convert Capture Order string to an Array, removing whitespace
        const requiredArray = maskedPayData.Required.split(",").map((item) => item.trim());
        console.log("scanMaskedPayData requiredArray: ", requiredArray);

        // console.log("maskedPayData.Required: ", maskedPayData.Required);
        console.log("scanMaskedPayData captureOrder: ", captureOrder);
        console.log(
            "scanMaskedPayData requiredArray.length: ",
            requiredArray.length,
            "captureOrder.length: ",
            captureOrder.length
        );

        if (requiredArray.length < captureOrder.length) {
            console.log("scanMaskedPayData requiredArray.length < captureOrder.length");
            // Remove the first element from the captureOrder array
            captureOrder.shift();
            console.log("scanMaskedPayData captureOrder: ", captureOrder);
            // Call the next capture API
            const newUrl = PUBLIC_SERVER_URL + "/" + captureOrder[0];
            console.log("scanMaskedPayData newUrl: ", newUrl);

            try {
                const result = await axios.post(newUrl, {
                    callSid,
                    paymentSid,
                });
                console.log("scanMaskedPayData newUrl result: ", result.data);
            } catch (error) {
                console.error("Error in scanMaskedPayData: ", error);
            }
        } else {
            console.log("scanMaskedPayData requiredArray.length >= captureOrder.length");
        }
    } else {
        console.log("scanMaskedPayData maskedPayData.Required is not present");
        console.log("startedCapturing: ", startedCapturing);
        if (startedCapturing) {
            console.log("scanMaskedPayData startedCapturing is true and stopping polling");
            canSubmit = true;
        }
    }
};

// Polling function to update payment data
function startPollmaskedPayData() {
    pollTimer = setInterval(async () => {
        console.log("Polling API /poll-point");
        try {
            const response = await fetch(PUBLIC_SERVER_URL + "/sync/getSyncToken", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: "syncClientIdentity"
                })
            })
            const jwtToken = await response.json();
            // Create a new Sync Client

            syncClient = new SyncClient(jwtToken, {});
            payMap = await syncClient.map('payMap');
            console.log('Client payMap created');

            // Add Event Listener for data changes. Update the card data when the item is updated
            payMap.on('itemUpdated', (args) => {
                console.log(`payMap item ${JSON.stringify(args, null, 4)} was UPDATED`);
                /*
                  { 
                    "SecurityCode": "xxx",
                    "PaymentCardType": "visa",
                    "Sid": "PK5967a7414bd0566b5fba68d7728e3923",
                    "PaymentConfirmationCode": "ch_a9dc6297cd1a4fb095e61b1a9cf2dd1d",
                    "CallSid": "CAc99f75b7f210edd87b01577c84655b4a",
                    "Result": "success",
                    "AccountSid": "AC75xxxxxx",
                    "ProfileId": "",
                    "DateUpdated": "2021-08-10T03:58:27.290Z",
                    "PaymentToken": "",
                    "PaymentMethod": "credit-card",
                    "PaymentCardNumber": "xxxxxxxxxxxx1111",
                    "ExpirationDate": "1225"
                  }
                */

                // Update payment data
                maskedPayData.PaymentCardNumber = args.item.data.PaymentCardNumber;
                maskedPayData.ExpirationDate = args.item.data.ExpirationDate;
                maskedPayData.PaymentCardType = args.item.data.PaymentCardType;
                maskedPayData.SecurityCode = args.item.data.SecurityCode;

                this._partialResult = args.item.data.PartialResult;

                scanMaskedPayData();
                // Update window input values
                updateInputs();
            });

        } catch (error) {
            console.error('Error: Could not create new SyncClient', error);
        };
    }, 1000); // Poll every 1 second
}

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const callSid = urlParams.get('callSid');
const paymentSid = urlParams.get('paymentSid');

// Update input values with payment data
function updateInputs() {
    document.getElementById('card').value = maskedPayData.PaymentCardNumber;
    document.getElementById('cvc').value = maskedPayData.SecurityCode;
    document.getElementById('date').value = maskedPayData.ExpirationDate;
}

// Reset input values
function resetCardInput() {
    maskedPayData.PaymentCardNumber = "-------------------"
    // document.getElementById('card').value = "";
    updateInputs();
}
function resetCvcInput() {
    maskedPayData.SecurityCode = "---";
    // document.getElementById('cvc').value = "";
    updateInputs();
}
function resetDateInput() {
    maskedPayData.ExpirationDate = "--/--";
    // document.getElementById('date').value = "";
    updateInputs();
}

// Update inputs on page load
window.onload = function () {
    // Extract the URL parameters
    document.getElementById('callSid').innerText = callSid;
    document.getElementById('paymentSid').innerText = paymentSid;
    startPollmaskedPayData();
};

function submit() {
    // Add your submit function code here
    // This function will be called when the Submit button is clicked
    clearInterval(pollTimer);
}

function cancel() {
    // Add your cancel function code here
    // This function will be called when the Cancel button is clicked
    clearInterval(pollTimer);

}