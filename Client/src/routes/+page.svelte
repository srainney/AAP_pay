<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    PUBLIC_SERVER_URL,
    PUBLIC_PAYMENT_CONNECTOR,
    PUBLIC_PAYMENT_CURRENCY,
    PUBLIC_PAYMENT_TOKEN_TYPE,
    PUBLIC_PAYMENT_CAPTURE_ORDER,
    PUBLIC_TWILIO_TOKEN,
  } from "$env/static/public";

  let callSid = "";
  let paymentSid = "";

  // Convert Capture Order string to an Array, removing whitespace
  const captureOrderArray = PUBLIC_PAYMENT_CAPTURE_ORDER.split(",").map((item) => item.trim());
  let showPleaseWait = false;

  onMount(() => {
    console.log("capture Array Order: ", captureOrderArray);
    showPleaseWait = false;
  });

  const startCapture = async function () {
    // navigate to payments page
    console.info(`#######################  startCapture callSid: ${callSid}`);
    if (callSid.length > 0) {
      // console.log(`startCapture CallSid length: ${callSid.length}`);
      showPleaseWait = true;
      try {
        let bodyData = {
          callSid: callSid,
        };

        const response = await fetch("/payment/startCapture", {
          method: "POST",
          body: JSON.stringify(bodyData),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const responseJSON = await response.json();
        paymentSid = responseJSON.sid;
        // console.log(`startCapture paymentSid: ${paymentSid}`);

        if (paymentSid) {
          // Navigate to the payment page
          goto(`/payment?call-sid=${callSid}&payment-sid=${paymentSid}`);
        } else {
          alert(`Could not get a payment SID value for call SID: ${callSid}`);
        }
      } catch (error) {
        console.error(`startCapture Error: ${error}`);
      }
    } else {
      alert("Please enter a valid Call SID");
    }
  };
</script>

<main class="main-content">
  <h1 class="title">Twilio Pay</h1>
  <label for="callSID" class="visually-hidden" placeholder={callSid}>Call SID</label>
  <input
    class="input-field"
    id="callSID"
    type="text"
    placeholder="CAxxxxxxxxxx"
    aria-label="Call SID"
    bind:value={callSid}
  />
  <p class="description">Paste the Call SID here & click Capture</p>
  <button on:click={startCapture} class="capture-button" tabindex="0">Capture</button>
  {#if showPleaseWait}
    <h2>Starting Capture. Please wait ...........</h2>
  {/if}
</main>

<style>
  .main-content {
    display: flex;
    max-width: 326px;
    flex-direction: column;
    font-size: 14px;
    color: #121c2d;
    font-weight: 600;
    padding: 20px;
  }

  .title {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    width: 100%;
    font:
      800 64px "Twilio Sans Display",
      -apple-system,
      Roboto,
      Helvetica,
      sans-serif;
  }

  .input-field {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family: "Twilio Sans Text", sans-serif;
    font-style: italic;
    background-color: #fff;
    color: #606b85;
    font-weight: 400;
    line-height: 143%;
    justify-content: center;
    padding: 8px 12px;
    border: 1px solid rgba(136, 145, 170, 1);
    border-radius: 4px;
  }

  .description {
    color: #606b85;
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family: "Twilio Sans Text", sans-serif;
    font-weight: 400;
    line-height: 143%;
    margin-top: 8px;
  }

  .capture-button {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family: "Twilio Sans Text", sans-serif;
    justify-content: center;
    background-color: #006dfa;
    color: #fff;
    white-space: nowrap;
    text-align: center;
    line-height: 143%;
    padding: 8px 12px;
    border: 1px solid rgba(0, 109, 250, 1);
    border-radius: 4px;
    align-self: end;
    margin-top: 22px;
    cursor: pointer;
  }

  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
</style>
