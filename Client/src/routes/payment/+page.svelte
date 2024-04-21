<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy, beforeUpdate } from "svelte";
  import { PUBLIC_PAYMENT_CAPTURE_ORDER, PUBLIC_SERVER_URL } from "$env/static/public";
  import { SyncClient } from "twilio-sync";

  // Styles:
  import {
    Container,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardTitle,
    InputGroup,
    InputGroupText,
    Button,
  } from "@sveltestrap/sveltestrap";

  // Convert Capture Order string to an Array, removing whitespace
  let captureOrder = PUBLIC_PAYMENT_CAPTURE_ORDER.split(",").map((item) => item.trim());

  let callSid = "";
  let paymentSid = "";
  let maskedPayData = {
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
  let startedCapturing = false;
  let canSubmit = false;

  // This is required to be able to deploy the page as a static site on Twilio Functions.
  beforeUpdate(() => {
    callSid = $page.url.searchParams.get("call-sid");
    paymentSid = $page.url.searchParams.get("payment-sid");
  });

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

      // navigate to payments page
      goto(`/`);
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
  // 3) When the "required" string length is less than the captureOrder array length, it updates the captureOrder array, removing the first element and calling the next capture API
  const scanMaskedPayData = async function () {
    // If there is a required attribute, start capturing
    if (maskedPayData.Required) {
      // Set the capturing flag
      startedCapturing = true;

      // Convert Capture Order string to an Array, removing whitespace
      const requiredArray = maskedPayData.Required.split(",").map((item) => item.trim());

      // If the requiredArray length is less than the captureOrder array length, call the next capture API
      if (requiredArray.length < captureOrder.length) {
        // Remove the first element from the captureOrder array
        captureOrder.shift();

        try {
          console.log(`Call the next capture API with ##### ${captureOrder[0]} #####`);
          const response = await fetch(PUBLIC_SERVER_URL + "/aap/changeCapture", {
            method: "POST",
            body: JSON.stringify({
              callSid,
              paymentSid,
              captureType: captureOrder[0],
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
      console.log("scanMaskedPayData maskedPayData.Required is not present");
      if (startedCapturing) {
        console.log("scanMaskedPayData startedCapturing is true and stop sync update");
        canSubmit = true;
        // Stop Sync. TODO: This is to stop a bug where Sync just keeps updating the maskedPayData
        payMap.removeAllListeners(["itemUpdated"]);
      }
    }
  };

  onMount(async () => {
    // Now start capturing the card
    try {
      // Set capture to first item in capture order array
      const response = await fetch(PUBLIC_SERVER_URL + "/aap/changeCapture", {
        method: "POST",
        body: JSON.stringify({
          callSid,
          paymentSid,
          captureType: captureOrder[0],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const responseJSON = await response.json();
      console.log("onMount changeCapture responseJSON: ", JSON.stringify(responseJSON, null, 4));
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
    } catch (error) {
      console.log("onMount sync token error: ", error);
      return;
    }

    try {
      syncClient = new SyncClient(syncToken, {});
      payMap = await syncClient.map("payMap");
      console.log(`Client payMap hooked to Sync: ${payMap.sid}`);

      // Add Event Listener for data changes. Update the card data
      payMap.on("itemUpdated", (args) => {
        // assign all values from args.item.data to maskedPayData using a spread operator
        maskedPayData = { ...args.item.data };

        // console.log(`itemUpdated maskedPayData ${Date.now().toLocaleString}: ${JSON.stringify(maskedPayData, null, 4)}`);
        // Check if we progress the capture order
        scanMaskedPayData();
      });
    } catch (error) {}
  });

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
      <CardTitle>Twilio Pay</CardTitle>
    </CardHeader>
    <CardBody>
      <Container>
        <InputGroup class="mb-3">
          <InputGroupText style="width: 200px;">Masked Card:</InputGroupText>
          <InputGroupText style="width: 200px;">{maskedPayData.paymentCardNumber}</InputGroupText>
          <Button color="danger" on:click={clearCard}>Clear</Button>
        </InputGroup>
        <InputGroup class="mb-3">
          <InputGroupText style="width: 200px;">Masked CVC:</InputGroupText>
          <InputGroupText style="width: 200px;">{maskedPayData.SecurityCode}</InputGroupText>
          <Button color="danger" on:click={clearCVC}>Clear</Button>
        </InputGroup>
        <InputGroup class="mb-3">
          <InputGroupText style="width: 200px;">Masked Exp. Date:</InputGroupText>
          <InputGroupText style="width: 200px;">{maskedPayData.ExpirationDate}</InputGroupText>
          <Button color="danger" on:click={clearDate}>Clear</Button>
        </InputGroup>
      </Container>

      <Button color="success" disabled={!canSubmit} on:click={submit}>Submit</Button>
      <Button color="danger" on:click={cancelSubmit}>Cancel</Button>
    </CardBody>
    <CardFooter></CardFooter>
  </Card>

  <h2>callSid: {callSid}</h2>
  <h2>paymentSid: {paymentSid}</h2>
</Container>
