import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { verifyAndGetUser } from "./authHelper";
import { getSheetsClient } from "./sheetsClient";

export const getSheetData = onCall(async (request) => {
  const data = request.data;
  // ── 1. Auth ─────────────────────────────────────────────────────────────
  const user = await verifyAndGetUser(data, request);
  const sheetId = data.sheetId;
  const page = data.page ?? 1;
  const pageSize = Math.min(data.pageSize ?? 50, 200); // cap at 200

  // ── 2. Verify sheet access ───────────────────────────────────────────────
  const sheetDoc = await admin
    .firestore()
    .collection("sheets")
    .doc(sheetId)
    .get();

  if (!sheetDoc.exists || sheetDoc.data()?.isActive === false) {
    throw new HttpsError("not-found", "Sheet not found.");
  }

  const sheetData = sheetDoc.data()!;
  const isAdmin = ["owner", "manager", "head"].includes(user.role);
  const hasAccess =
    isAdmin ||
    sheetData.assignedUsers.includes(user.uid) ||
    sheetData.permissions?.canView?.includes(user.uid) ||
    sheetData.permissions?.canEdit?.includes(user.uid);

  if (!hasAccess) {
    throw new HttpsError("permission-denied", "You do not have access to this sheet.");
  }

  // ── 3. Fetch data from Google Sheets API ─────────────────────────────────
  const sheetsApi = getSheetsClient();
  const googleSheetId = sheetData.googleSheetId;

  // Get total row count first
  const metaResponse = await sheetsApi.spreadsheets.get({
    spreadsheetId: googleSheetId,
    fields: "sheets.properties",
  });

  const sheetProperties = metaResponse.data.sheets?.[0].properties ?? {};
  const totalRows = Math.max(
    (sheetProperties.gridProperties?.rowCount ?? 1) - 1, // minus header
    0
  );

  // Calculate range for current page
  const startRow = (page - 1) * pageSize + 2; // +2 because row 1 is header
  const endRow = startRow + pageSize - 1;

  // Get headers (row 1)
  const headerResponse = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: googleSheetId,
    range: "Sheet1!1:1",
  });
  const headers = headerResponse.data.values?.[0] ?? [];

  // Get data rows
  const dataResponse = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: googleSheetId,
    range: `Sheet1!A${startRow}:ZZ${endRow}`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const rows = (dataResponse.data.values ?? []).map((row: any[]) => {
    // Pad row to header length
    const padded = [...row];
    while (padded.length < headers.length) padded.push("");
    return padded.map(String);
  });

  return {
    title: sheetData.name,
    headers: headers.map(String),
    rows,
    totalRows,
    startRow,
    page,
    pageSize,
  };
});
