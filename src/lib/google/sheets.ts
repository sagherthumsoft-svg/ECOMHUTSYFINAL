import { sheets, drive, MASTER_FOLDER_ID } from "./config";

/**
 * Creates a new spreadsheet directly in the target folder and shares it
 */
export async function createSpreadsheet(name: string, creatorEmail?: string, templateData: any[][] = []) {
  if (!MASTER_FOLDER_ID) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID environment variable.");
  }

  // 1. Create file directly in Drive (inside folder)
  const file = await drive.files.create({
    requestBody: {
      name: name,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [MASTER_FOLDER_ID],
    },
    supportsAllDrives: true,
    fields: "id",
  });

  const spreadsheetId = file.data.id;
  if (!spreadsheetId) {
    throw new Error("Failed to create spreadsheet");
  }

  // 2. Grant permissions
  // Always share with the creator if email provided
  if (creatorEmail) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: creatorEmail,
        },
        supportsAllDrives: true,
      });
    } catch (e) {
      console.warn(`Could not share sheet with ${creatorEmail}:`, e);
    }
  }

  // Always share with the admin/fallback email if provided in the code (as requested by user's manual edit)
  const adminEmail = "sajidiqbal@ecomhutsy.com";
  if (adminEmail && adminEmail !== creatorEmail) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: adminEmail,
        },
        supportsAllDrives: true,
      });
    } catch (e) {
      console.warn(`Could not share sheet with ${adminEmail}:`, e);
    }
  }

  // 3. (Optional) Add template data
  if (templateData.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: templateData,
      },
    });
  }

  return spreadsheetId;
}

/**
 * Fetches data from a spreadsheet
 */
export async function getSheetData(spreadsheetId: string, range: string = "Sheet1") {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

/**
 * Updates data in a spreadsheet
 */
export async function updateSheetData(spreadsheetId: string, range: string, values: any[][]) {
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });

  return response.data;
}

/**
 * Appends a row to a spreadsheet
 */
export async function appendSheetRow(spreadsheetId: string, range: string, values: any[][]) {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });

  return response.data;
}

/**
 * Trashes a spreadsheet in Google Drive
 */
export async function deleteSpreadsheet(spreadsheetId: string) {
  await drive.files.update({
    fileId: spreadsheetId,
    requestBody: {
      trashed: true,
    },
    supportsAllDrives: true,
  });

  return true;
}

/**
 * Exports a spreadsheet to a specific format
 */
export async function exportSheet(spreadsheetId: string, format: string) {
  let mimeType = "";

  switch (format) {
    case "xlsx":
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      break;
    case "pdf":
      mimeType = "application/pdf";
      break;
    case "csv":
      mimeType = "text/csv";
      break;
    default:
      throw new Error("Unsupported format");
  }

  const response = await drive.files.export(
    {
      fileId: spreadsheetId,
      mimeType: mimeType,
    },
    {
      responseType: "arraybuffer",
    }
  );

  return response.data;
}
