/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

// Global options for all functions
setGlobalOptions({ maxInstances: 10 });

// Export User Management functions
export { createUser } from "./createUser";

// Export Google Sheets functions
export { createSheet } from "./sheets/createSheet";
export { listSheets } from "./sheets/listSheets";
export { getSheetData } from "./sheets/getSheetData";
export { updateSheet } from "./sheets/updateSheet";
export { deleteSheet } from "./sheets/deleteSheet";
export { assignSheet } from "./sheets/assignSheet";
export { searchSheets } from "./sheets/searchSheets";
export { updateCell } from "./sheets/updateCell";

