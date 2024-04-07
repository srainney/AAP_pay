/**
 * This function sets up the Synd services needed for the code. It is a one-time setup. It will set up the SyncService and write the value into the environment variable. It will also create the SyncMap and uuiMap needed.
 * 
 * Call this function directly using the following Curl command:
 * 
 * ```
 * curl -X POST https://<runtime-domain>/sync/setupSyncServices
 * ```
 * 
 */
exports.handler = async (context, event, callback) => {

  const restClient = context.getTwilioClient();

  try {
    // Create the Sync Service. NOTE: This creates a new service even with the same friendly name, so make sure you use a unique name. The SID will be different.
    const syncService = await restClient.sync.services.create({ friendlyName: context.PAY_SYNC_SERVICE_NAME });
    // Now update the Sync Service SID in the environment variables
    context.PAY_SYNC_SERVICE_SID = syncService.sid;

    console.info(`Sync Service ${context.PAY_SYNC_SERVICE_NAME} created with SID: ${context.PAY_SYNC_SERVICE_SID}`);

    // Create the Payment Sync Map
    try {
      await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
        .syncMaps
        .create({ uniqueName: context.SYNC_PAY_MAP_NAME });
      console.info(`Sync Map ${context.SYNC_PAY_MAP_NAME} created`);

    } catch (error) {
      console.error(`Error setting up ${context.SYNC_PAY_MAP_NAME}: ${error}`);
      return callback(`Error setting up ${context.SYNC_PAY_MAP_NAME}: ${error}`, null);
    }

    // Create the UUI Sync Map
    try {
      await restClient.sync.services(context.PAY_SYNC_SERVICE_SID)
        .syncMaps
        .create({ uniqueName: context.SYNC_UUI_MAP_NAME });
      console.info(`Sync Map ${context.SYNC_UUI_MAP_NAME} created`);


    } catch (error) {
      console.error(`Error setting up ${context.SYNC_UUI_MAP_NAME}: ${error}`);
      return callback(`Error setting up ${context.SYNC_UUI_MAP_NAME}: ${error}`, null);
    }

    return callback(null, "Sync Services setup complete");

  } catch (error) {
    console.error(`Error setting up Sync Service: ${error}`);
    return callback(`Error setting up Sync Service ${context.PAY_SYNC_SERVICE_NAME}: ${error}`, null);
  }
};
