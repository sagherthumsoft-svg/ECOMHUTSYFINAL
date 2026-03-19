import { google } from "googleapis";

let sheetsClient: any = null;
let driveClient: any = null;

/**
 * Returns an authenticated Google Sheets API client.
 * Uses service account credentials stored in environment variables.
 */
export function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const projectId = process.env.SA_PROJECT_ID || process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.SA_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.SA_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Service Account credentials in environment variables (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)."
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export function getDriveClient() {
  if (driveClient) return driveClient;

  const projectId = process.env.SA_PROJECT_ID || process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.SA_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.SA_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Service Account credentials in environment variables."
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

/**
 * Gets the master folder ID where all sheets are created.
 */
export function getMasterFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error(
      "Missing GOOGLE_DRIVE_FOLDER_ID in environment variables."
    );
  }
  return folderId;
}
