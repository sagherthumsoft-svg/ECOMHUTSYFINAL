import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { verifyAndGetUser } from "./authHelper";
import { getSheetsClient } from "./sheetsClient";

export const searchSheets = onCall(async (request) => {
  const data = request.data;
  const user = await verifyAndGetUser(data, request);
  const { sheetId, query } = data;

  if (!query || query.trim().length < 2) {
    return { rows: [] };
  }

  // Verify access
  const sheetDoc = await admin.firestore().collection("sheets").doc(sheetId).get();
  if (!sheetDoc.exists) {
    throw new HttpsError("not-found", "Sheet not found.");
  }

  const sheetData = sheetDoc.data()!;
  const isAdmin = ["owner", "manager", "head"].includes(user.role);
  const hasAccess = isAdmin || sheetData.assignedUsers.includes(user.uid);

  if (!hasAccess) {
    throw new HttpsError("permission-denied", "No access.");
  }

  // Fetch all data (for search — consider caching for large sheets)
  const sheetsApi = getSheetsClient();
  const response = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: sheetData.googleSheetId,
    range: "Sheet1",
    valueRenderOption: "FORMATTED_VALUE",
  });

  const allValues = response.data.values ?? [];
  const lowerQuery = query.toLowerCase();
  const matchingRows: any[] = [];

  allValues.forEach((row: any[], index: number) => {
    if (index === 0) return; // skip header
    const cells = row.map(String);
    const rowText = cells.join(" ").toLowerCase();
    if (rowText.includes(lowerQuery)) {
      matchingRows.push({
        rowIndex: index + 1, // 1-based
        cells,
      });
    }
  });

  return { rows: matchingRows };
});
