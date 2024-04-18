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

  let callSid = null;
  let paymentSid = null;

  let myParameter = null;
  beforeUpdate(() => {
    callSid = $page.url.searchParams.get("call-sid");
    paymentSid = $page.url.searchParams.get("payment-sid");
  });

  // Convert Capture Order string to an Array, removing whitespace
  let captureOrder = PUBLIC_PAYMENT_CAPTURE_ORDER.split(",").map((item) => item.trim());

  let startedCapturing = false;
  let canSubmit = false;
  let maskedPayData = {
    PaymentCardNumber: "-",
    PaymentCardType: "-",
    ExpirationDate: "-",
    SecurityCode: "-",
    Required: "payment-card-number,expiration-date,security-code",
  };

  // Sync Client
  let syncClient = null;
  let syncToken = "";
  let payMap = null;

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
    clearInterval(pollTimer);
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

        try {
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
          console.log("scanMaskedPayData response: ", responseJSON.data);
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
        // clearInterval(pollTimer);
      }
    }
  };

  // Set up timer to poll API every 100ms onMount
  onMount(async () => {
    // Now start capturing the card
    try {
      console.log("onMount captureOrder[0]: ", captureOrder[0]);

      // Set capture to first itme in array TODO: check if we actually need this?
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
      // console.log("onMount response: ", response);
      console.log("onMount response: ", response);
      const responseJSON = await response.json();
      console.log("onMount responseJSON: ", JSON.stringify(responseJSON, null, 4));
    } catch (error) {
      console.log("onMount error: ", error);
      return;
    }

    // Get the Sync Token from the server
    try {
      console.log(`onMount getting Sync Token for callSid: ${callSid}`);

      const response = await fetch(PUBLIC_SERVER_URL + "/sync/getSyncToken", {
        method: "POST",
        body: JSON.stringify({
          callSid,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      // console.log("onMount response: ", response);
      console.log("onMount response: ", response);
      syncToken = await response.json();
      console.log("onMount sync token: ", syncToken);
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
        const itemData = args.item.data;
        console.log("itemData: ", itemData);

        // // Update the local variables
        maskedPayData.paymentCardNumber = itemData.PaymentCardNumber;
        maskedPayData.paymentCardType = itemData.PaymentCardType;
        maskedPayData.securityCode = itemData.SecurityCode;
        maskedPayData.expirationDate = itemData.ExpirationDate;
      });
    } catch (error) {}
  });

  onDestroy(() => {
    // When navigating away from the page, stop the poll timer
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
