let maskedPayData = {
    paymentCardNumber: "",
    paymentCardType: "",
    securityCode: "",
    expirationDate: "",
    paymentToken: "",
    profileId: "",
};

// Add Event Listener for data changes. Update the card data
syncClient = new SyncClient(syncToken, {});
payMap = await syncClient.map('payMap');

payMap.on('itemUpdated', (args) => {
    maskedPayData.paymentCardNumber = args.item.data.PaymentCardNumber;
}

<label class="card-data">{maskedPayData.paymentCardNumber}</label>
