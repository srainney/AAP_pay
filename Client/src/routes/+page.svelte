<script>
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { PUBLIC_SERVER_URL, PUBLIC_PAYMENT_CURRENCY, PUBLIC_PAYMENT_CAPTURE_ORDER } from "$env/static/public";
  import { SyncClient } from "twilio-sync";

  // Styles:
  import {
    Container,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardSubtitle,
    CardText,
    CardTitle,
    InputGroup,
    InputGroupText,
    Input,
    Button,
  } from "@sveltestrap/sveltestrap";

  // Convert Capture Order string to an Array, removing whitespace
  const captureOrderArray = PUBLIC_PAYMENT_CAPTURE_ORDER.split(",").map((item) => item.trim());
  let callSid = "";
  let paymentSid = "";
  let captureButtonDisabled = true;
  let syncData = {
    // Initial placeholder data
    PaymentCardNumber: "-",
    PaymentCardType: "-",
    ExpirationDate: "-",
    SecurityCode: "-",
  };

  // Sync Client
  let syncClient = null;
  let syncToken = "";
  let payMap = null;

  // Page visual control attributes
  let showPleaseWait = false;
  let startedCapturing = false;
  let canSubmit = false;

  // Reactively check callSid entered follows the following pattern: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx and then enable the Capture button
  $: if (callSid.length > 0) {
    if (/^CA[0-9a-f]{32}$/.test(callSid)) {
      captureButtonDisabled = false;
    } else {
      captureButtonDisabled = true;
    }
  }

  onMount(() => {
    // console.log("capture Array Order: ", captureOrderArray);
    // showPleaseWait = false;
  });

  const startCapture = async function () {
    showPleaseWait = true;

    try {
      const response = await fetch(PUBLIC_SERVER_URL + "/aap/startCapture", {
        method: "POST",
        body: JSON.stringify({
          callSid: callSid,
          currency: PUBLIC_PAYMENT_CURRENCY,
          chargeAmount: "0", // Request a payment token type
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const responseJSON = await response.json();

      paymentSid = responseJSON.sid;
      console.log("startCapture: get PAyment SID responseJSON: ", JSON.stringify(responseJSON, null, 4));

      if (paymentSid) {
        // Now start capturing the payment-card
        try {
          // Set capture to first item in capture order array
          const response = await fetch(PUBLIC_SERVER_URL + "/aap/changeCapture", {
            method: "POST",
            body: JSON.stringify({
              callSid,
              paymentSid,
              captureType: captureOrderArray[0],
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          const responseJSON = await response.json();
          console.log("startCapture: changeCapture responseJSON: ", JSON.stringify(responseJSON, null, 4));
        } catch (error) {
          console.log("onMount error: ", error);
          return;
        }

        // Get the Sync Token from the server
        try {
          const response = await fetch(PUBLIC_SERVER_URL + "/sync/getSyncToken", {
            method: "POST",
            body: JSON.stringify({
              callSid,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          syncToken = await response.json();
          console.log("startCapture: get Sync Token response: ", JSON.stringify(syncToken, null, 4));

          // Now hook the client to Sync
          try {
            syncClient = new SyncClient(syncToken, {});
            payMap = await syncClient.map("payMap");
            console.log(`Client payMap hooked to Sync: ${payMap.sid}`);

            // Add Event Listener for data changes. Update the card data
            payMap.on("itemUpdated", (args) => {
              syncData = { ...args.item.data }; // assign all values from args.item.data to syncData using a spread operator
              console.log("payMap itemUpdated: ", JSON.stringify(syncData, null, 4));
              // Check if we progress the capture order
              scanMaskedPayData();
            });
            showPleaseWait = false;
            captureButtonDisabled = true;
          } catch (error) {
            console.error(`Error in SyncClient: ${error}`);
            return;
          }
        } catch (error) {
          console.log("onMount sync token error: ", error);
          return;
        }
      } else {
        alert(`Could not get a payment SID value for call SID: ${callSid}`);
      }
    } catch (error) {
      console.error(`startCapture Error: ${error}`);
    }
  };

  const clearSid = function () {
    callSid = "";
  };

  // Handle Cancel click
  const cancelSubmit = async function () {
    try {
      console.log("Cancel clicked");
      const response = await fetch(PUBLIC_SERVER_URL + "/aap/changeStatus", {
        method: "POST",
        body: JSON.stringify({
          callSid,
          paymentSid,
          status: "cancel",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const responseJSON = await response.json();
      console.log("Cancel response: ", responseJSON.data);
    } catch (error) {
      // Log the error
      console.error("Error in Cancel: ", error);
    }
  };

  // Handle the Submit click
  const submit = async function () {
    canSubmit = false;
    try {
      console.log("Submit clicked");
      // Now submit the card data
      const response = await fetch(PUBLIC_SERVER_URL + "/aap/changeStatus", {
        method: "POST",
        body: JSON.stringify({
          callSid,
          paymentSid,
          status: "complete",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const responseJSON = await response.json();
      console.log("Submit response: ", responseJSON.data);
    } catch (error) {
      // Log the error
      console.error("Error in submit: ", error);
    }
  };

  const clearCard = function () {};

  const clearCVC = function () {};

  const clearDate = function () {};

  // This function scans the received maskedPayData and performs a few operations:
  // 1) Checks if the Required attribute is present
  // 2) If the Required attribute is not present and the capture has started, it stops the sync
  // 3) When the "required" string length is less than the captureOrderArray array length, it updates the captureOrderArray array, removing the first element and calling the next capture API
  const scanMaskedPayData = async function () {
    // If there is a required attribute, start capturing
    if (syncData.Required) {
      // Set the capturing flag
      startedCapturing = true;

      // Convert Capture Order string to an Array, removing whitespace
      const requiredArray = syncData.Required.split(",").map((item) => item.trim());

      // If the requiredArray length is less than the captureOrderArray array length, call the next capture API
      if (requiredArray.length < captureOrderArray.length) {
        // Remove the first element from the captureOrderArray array
        captureOrderArray.shift();

        try {
          console.log(`Call the next capture API with ##### ${captureOrderArray[0]} #####`);
          const response = await fetch(PUBLIC_SERVER_URL + "/aap/changeCapture", {
            method: "POST",
            body: JSON.stringify({
              callSid,
              paymentSid,
              captureType: captureOrderArray[0],
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          const responseJSON = await response.json();
          console.log("scanMaskedPayData next capture responseJSON: ", JSON.stringify(responseJSON, null, 4));
        } catch (error) {
          console.error("Error in scanMaskedPayData: ", error);
        }
      }
    } else {
      console.log("scanMaskedPayData: maskedPayData.Required is not present");
      if (startedCapturing) {
        console.log("scanMaskedPayData: startedCapturing is true and stop sync update");
        canSubmit = true;
        // Stop Sync. TODO: This is to stop a bug where Sync just keeps updating the maskedPayData
        payMap.removeAllListeners(["itemUpdated"]);
      }
    }
  };

  onDestroy(() => {
    // Remove the payMap event listener
    if (payMap) {
      payMap.close();
      payMap.removeAllListeners(["itemUpdated"]);
    }
  });
</script>

<Container>
  <Card theme="dark">
    <CardHeader>
      <CardTitle>Twilio Call Data</CardTitle>
    </CardHeader>
    <CardBody>
      <InputGroup>
        <InputGroupText>
          <label for="callSID" placeholder={callSid}>Call SID</label>
        </InputGroupText>

        <Input id="callSID" type="text" placeholder="CAxxxxxxxxxx" aria-label="Call SID" bind:value={callSid} />
        <Button color="danger" on:click={clearSid}>Clear</Button>
      </InputGroup>

      <p>Paste the Call SID here & click Capture</p>
      <Button color="success" disabled={captureButtonDisabled} on:click={startCapture} tabindex="0">Capture</Button>
    </CardBody>
    <CardFooter>
      <h3>callSid: {callSid}</h3>
      {#if showPleaseWait}
        <h4>Starting Capture. Please wait ...........</h4>
      {/if}
    </CardFooter>
  </Card>
</Container>

<Container>
  <Card theme="dark">
    <CardHeader>
      <CardTitle>Twilio Pay - Capture Data</CardTitle>
    </CardHeader>
    <CardBody>
      <Container>
        <InputGroup class="mb-3">
          <InputGroupText style="width: 160px;">Masked Card:</InputGroupText>
          <InputGroupText style="width: 200px;">{syncData.PaymentCardNumber}</InputGroupText>
          <Button color="danger" on:click={clearCard}>Clear</Button>
        </InputGroup>
        <InputGroup class="mb-3">
          <InputGroupText style="width: 160px;">Masked CVC:</InputGroupText>
          <InputGroupText style="width: 200px;">{syncData.SecurityCode}</InputGroupText>
          <Button color="danger" on:click={clearCVC}>Clear</Button>
        </InputGroup>
        <InputGroup class="mb-3">
          <InputGroupText style="width: 160px;">Masked Exp. Date:</InputGroupText>
          <InputGroupText style="width: 200px;">{syncData.ExpirationDate}</InputGroupText>
          <Button color="danger" on:click={clearDate}>Clear</Button>
        </InputGroup>
      </Container>

      <Button color="success" disabled={!canSubmit} on:click={submit}>Submit</Button>
      <Button color="danger" on:click={cancelSubmit}>Cancel</Button>
    </CardBody>
    <CardFooter>
      <h3>paymentSid: {paymentSid}</h3>
    </CardFooter>
  </Card>
</Container>
