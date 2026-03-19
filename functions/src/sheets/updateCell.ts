import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { verifyAndGetUser, logAuditEvent } from "./authHelper";
import { getSheetsClient } from "./sheetsClient";

export const updateCell = onCall(async (request) => {
  const data = request.data;
  // ── 1. Auth ─────────────────────────────────────────────────────────────
  const user = await verifyAndGetUser(data, request);
  const { sheetId, row, col, value } = data;

  // ── 2. Check edit permission ─────────────────────────────────────────────
  const sheetDoc = await admin
    .firestore()
    .collection("sheets")
    .doc(sheetId)
    .get();

  if (!sheetDoc.exists || sheetDoc.data()?.isActive === false) {
    throw new HttpsError("not-found", "Sheet not found.");
  }

  const sheetData = sheetDoc.data()!;
  const isAdmin = ["owner", "manager"].includes(user.role);
  const canEdit = isAdmin || sheetData.permissions?.canEdit?.includes(user.uid);

  if (!canEdit) {
    throw new HttpsError("permission-denied", "You do not have edit permission for this sheet.");
  }

  // ── 3. Convert row/col to A1 notation ───────────────────────────────────
  const colLetter = _colToLetter(col);
  const cellRange = `Sheet1!${colLetter}${row}`;

  // ── 4. Update via Google Sheets API ─────────────────────────────────────
  const sheetsApi = getSheetsClient();
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId: sheetData.googleSheetId,
    range: cellRange,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[value]],
    },
  });

  // ── 5. Update Firestore metadata ─────────────────────────────────────────
  await admin.firestore().collection("sheets").doc(sheetId).update({
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ── 6. Audit log ─────────────────────────────────────────────────────────
  await logAuditEvent(sheetId, "cell_updated", user.uid, user.fullName, {
    row,
    col,
    colLetter,
    value,
    cellRange,
  });

  return { success: true, cellRange, value };
});

function _colToLetter(col: number) {
  let letter = "";
  let num = col + 1; // 0-indexed to 1-indexed
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}
