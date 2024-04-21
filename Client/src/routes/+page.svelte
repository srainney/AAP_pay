<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { PUBLIC_SERVER_URL, PUBLIC_PAYMENT_CURRENCY, PUBLIC_PAYMENT_CAPTURE_ORDER } from "$env/static/public";

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

  let callSid = "";
  let paymentSid = "";
  let captureButtonDisabled = true;

  // Reactively check callSid entered follows the following pattern: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx and then enable the Capture button
  $: if (callSid.length > 0) {
    if (/^CA[0-9a-f]{32}$/.test(callSid)) {
      captureButtonDisabled = false;
    } else {
      captureButtonDisabled = true;
    }
  }

  // Convert Capture Order string to an Array, removing whitespace
  const captureOrderArray = PUBLIC_PAYMENT_CAPTURE_ORDER.split(",").map((item) => item.trim());
  let showPleaseWait = false;

  onMount(() => {
    console.log("capture Array Order: ", captureOrderArray);
    showPleaseWait = false;
  });

  const startCapture = async function () {
    // Navigate to payments page
    showPleaseWait = true;
    try {
      let bodyData = {
        callSid: callSid,
        currency: PUBLIC_PAYMENT_CURRENCY,
        chargeAmount: "0",
      };

      const response = await fetch(PUBLIC_SERVER_URL + "/aap/startCapture", {
        method: "POST",
        body: JSON.stringify(bodyData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseJSON = await response.json();
      paymentSid = responseJSON.sid;

      if (paymentSid) {
        // Navigate to the payment page
        goto(`/payment?call-sid=${callSid}&payment-sid=${paymentSid}`);
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
</script>

<Container sm>
  <Card theme="dark">
    <CardHeader>
      <CardTitle>Twilio Pay</CardTitle>
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
      {#if showPleaseWait}
        <h4>Starting Capture. Please wait ...........</h4>
      {/if}
    </CardFooter>
  </Card>
</Container>
