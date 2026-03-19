import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { verifyAndGetUser, requireAdmin, logAuditEvent } from "./authHelper";
import { getSheetsClient, getDriveClient, getMasterFolderId } from "./sheetsClient";

export const createSheet = onCall(async (request) => {
  const data = request.data;
  // 1. Authentication & authorization
  const user = await verifyAndGetUser(data, request);
  requireAdmin(user);

  // 2. Create the Google Sheet via Service Account
  const sheetsApi = getSheetsClient();
  const driveApi = getDriveClient();
  const folderId = getMasterFolderId();

  // Create a blank spreadsheet
  const spreadsheet = await sheetsApi.spreadsheets.create({
    requestBody: {
      properties: {
        title: data.name,
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: "Sheet1",
            index: 0,
          },
        },
      ],
    },
  });

  const googleSheetId = spreadsheet.data.spreadsheetId;
  if (!googleSheetId) {
    throw new HttpsError("internal", "Failed to create Google Sheet.");
  }

  // Apply template if specified
  if (data.templateType) {
    await _applyTemplate(sheetsApi, googleSheetId, data.templateType);
  }

  // 3. Move to master folder so employees can't see it in Drive
  // Get current parents
  const fileMetadata = await driveApi.files.get({
    fileId: googleSheetId,
    fields: "parents",
    supportsAllDrives: true,
  });
  const currentParents = fileMetadata.data.parents?.join(",") ?? "";

  // Move to secure folder
  await driveApi.files.update({
    fileId: googleSheetId,
    addParents: folderId,
    removeParents: currentParents,
    supportsAllDrives: true,
    requestBody: {},
  });

  // 4. Save metadata to Firestore
  const docRef = admin.firestore().collection("sheets").doc();
  await docRef.set({
    name: data.name,
    googleSheetId,
    createdBy: user.uid,
    createdByName: user.fullName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    assignedUsers: [...(data.assignedUsers || []), user.uid],
    assignedGroups: data.assignedGroups ?? [],
    assignedWarehouses: data.assignedWarehouses ?? [],
    permissions: {
      canEdit: data.permissions?.canEdit ?? [],
      canView: data.permissions?.canView ?? [],
    },
    isActive: true,
    templateType: data.templateType ?? "Custom",
  });

  // 5. Audit log
  await logAuditEvent(docRef.id, "sheet_created", user.uid, user.fullName, {
    name: data.name,
    templateType: data.templateType ?? null,
  });

  return {
    success: true,
    sheetId: docRef.id,
    googleSheetId,
  };
});

async function _applyTemplate(sheetsApi: any, spreadsheetId: string, templateType: string) {
  const templates: Record<string, string[][]> = {
    orders: [
      ["Order ID", "Date", "Product", "Quantity", "Price", "Status", "Warehouse", "Notes"],
    ],
    inventory: [
      ["SKU", "Product Name", "Category", "Quantity", "Unit", "Location", "Last Updated", "Notes"],
    ],
    sales: [
      ["Date", "Sales Rep", "Product", "Units Sold", "Revenue", "Region", "Notes"],
    ],
    custom: [
      ["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"],
    ],
  };

  const headers = templates[templateType.toLowerCase()];
  if (!headers) return;

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    requestBody: { values: headers },
  });

  // Bold the header row
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headers[0].length,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.12,
                  green: 0.25,
                  blue: 0.69,
                },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
      ],
    },
  });
}
