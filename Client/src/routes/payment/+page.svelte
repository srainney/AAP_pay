<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy, beforeUpdate } from "svelte";
  import { PUBLIC_PAYMENT_CAPTURE_ORDER, PUBLIC_SERVER_URL } from "$env/static/public";

  import axios from "axios";

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
    ExpirationDate: "-",
    PaymentCardNumber: "-",
    PaymentCardType: "-",
    Required: "payment-card-number,expiration-date,security-code",
    SecurityCode: "-",
  };
  /**
   * @type {number | undefined}
   */
  let pollTimer;

  // Handle Cancel click
  const cancel = async function () {
    try {
      console.log("Cancel clicked");
      // Now submit the card data
      const response = await axios.post(PUBLIC_SERVER_URL + "/cancel-capture", {
        callSid,
        paymentSid,
      });
      console.log("Cancel response: ", response.data);
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
      const response = await axios.post(PUBLIC_SERVER_URL + "/finish-capture", {
        callSid,
        paymentSid,
      });
      console.log("Submit response: ", response.data);
    } catch (error) {
      // Log the error
      console.error("Error in submit: ", error);
    }
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
        // clearInterval(pollTimer);
      }
    }
  };

  // Set up timer to poll API every 100ms onMount
  onMount(async () => {
    // Now start capturing the card
    try {
      console.log("onMount captureOrder[0]: ", captureOrder[0]);
      const response = await axios.post(PUBLIC_SERVER_URL + "/" + captureOrder[0], {
        callSid,
        paymentSid,
      });
      console.log("onMount response: ", response.data);
    } catch (error) {
      console.log("onMount error: ", error);
      return;
    }

    pollTimer = setInterval(async () => {
      console.log("Polling API /poll-point");
      try {
        const result = await axios.get(PUBLIC_SERVER_URL + "/poll-point");
        maskedPayData = result.data;
        scanMaskedPayData();
      } catch (error) {
        console.error("Error in pollTimer: ", error);
      }
    }, 1000);
  });

  onDestroy(() => {
    // When navigating away from the page, stop the poll timer
    clearInterval(pollTimer);
  });
</script>

<h2>{callSid}</h2>

<div class="div">
  <div class="div-2">Twilio Pay</div>
  <!-- <div class="div-3">Card Number</div> -->
  <h3 class="div-3">Masked card: {maskedPayData.PaymentCardNumber}</h3>
  <h3 class="div-4">Masked CVC: {maskedPayData.SecurityCode}</h3>
  <h3 class="div-5">Exp. Date: {maskedPayData.ExpirationDate}</h3>
  <div class="div-6">
    <button class="btn-submit" disabled={!canSubmit} on:click={submit}>Submit</button>
    <button class="btn-cancel" on:click={cancel}>Cancel</button>
  </div>
  <div class="div-9">Token</div>
</div>

<style>
  .div {
    background-color: #fff;
    display: flex;
    max-width: 480px;
    width: 100%;
    flex-direction: column;
    font-size: 12px;
    color: var(--text-neutral-color-text-neutral, #030b5d);
    font-weight: 600;
    margin: 0 auto;
    padding: 31px 34px 80px;
  }
  .div-2 {
    color: var(--text-color-text, #121c2d);
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font:
      800 64px Twilio Sans Display,
      -apple-system,
      Roboto,
      Helvetica,
      sans-serif;
  }
  .div-3 {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family:
      Twilio Sans Text,
      sans-serif;
    justify-content: center;
    align-items: center;
    border-radius: var(--border-radius-border-radius-20, 4px);
    border-color: rgba(204, 228, 255, 1);
    border-style: solid;
    border-width: 1px;
    background-color: var(--background-neutral-color-background-neutral-weakest, #f4f9ff);
    margin-top: 78px;
    text-align: center;
    line-height: 133%;
    padding: 4px 8px;
  }
  .div-4 {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family:
      Twilio Sans Text,
      sans-serif;
    justify-content: center;
    align-items: center;
    border-radius: var(--border-radius-border-radius-20, 4px);
    border-color: rgba(204, 228, 255, 1);
    border-style: solid;
    border-width: 1px;
    background-color: var(--background-neutral-color-background-neutral-weakest, #f4f9ff);
    margin-top: 37px;
    white-space: nowrap;
    text-align: center;
    line-height: 133%;
    padding: 4px 8px;
  }
  .div-5 {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family:
      Twilio Sans Text,
      sans-serif;
    justify-content: center;
    align-items: center;
    border-radius: var(--border-radius-border-radius-20, 4px);
    border-color: rgba(204, 228, 255, 1);
    border-style: solid;
    border-width: 1px;
    background-color: var(--background-neutral-color-background-neutral-weakest, #f4f9ff);
    margin-top: 37px;
    text-align: center;
    line-height: 133%;
    padding: 4px 8px;
  }
  .div-6 {
    align-self: center;
    display: flex;
    margin-top: 59px;
    width: 221px;
    max-width: 100%;
    gap: 20px;
    font-size: 14px;
    color: var(--text-inverse-color-text-inverse, #fff);
    white-space: nowrap;
    text-align: center;
    line-height: 143%;
    justify-content: space-between;
  }

  .btn-submit {
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

  .btn-cancel {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family: "Twilio Sans Text", sans-serif;
    justify-content: center;
    background-color: #c72323;
    color: white;
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
  .div-9 {
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings:
      "clig" off,
      "liga" off;
    font-family:
      Twilio Sans Text,
      sans-serif;
    justify-content: center;
    align-items: center;
    border-radius: var(--border-radius-border-radius-20, 4px);
    border-color: rgba(204, 228, 255, 1);
    border-style: solid;
    border-width: 1px;
    background-color: var(--background-neutral-color-background-neutral-weakest, #f4f9ff);
    margin-top: 51px;
    white-space: nowrap;
    text-align: center;
    line-height: 133%;
    padding: 4px 8px;
  }
</style>
