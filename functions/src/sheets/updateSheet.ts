import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { verifyAndGetUser, logAuditEvent } from "./authHelper";
import { getSheetsClient } from "./sheetsClient";

export const updateSheet = onCall(async (request) => {
  const data = request.data;
  const user = await verifyAndGetUser(data, request);
  const { sheetId, action, values } = data;

  const sheetDoc = await admin.firestore().collection("sheets").doc(sheetId).get();
  if (!sheetDoc.exists) {
    throw new HttpsError("not-found", "Sheet not found.");
  }

  const sheetData = sheetDoc.data()!;
  const isAdmin = ["owner", "manager"].includes(user.role);
  const canEdit = isAdmin || sheetData.permissions?.canEdit?.includes(user.uid);

  if (!canEdit) {
    throw new HttpsError("permission-denied", "Edit permission required.");
  }

  if (action === "addRow" && values) {
    const sheetsApi = getSheetsClient();
    await sheetsApi.spreadsheets.values.append({
      spreadsheetId: sheetData.googleSheetId,
      range: "Sheet1",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });

    await admin.firestore().collection("sheets").doc(sheetId).update({
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAuditEvent(sheetId, "row_added", user.uid, user.fullName, { values });
  }

  return { success: true };
});
