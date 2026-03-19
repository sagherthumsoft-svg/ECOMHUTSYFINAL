import { google } from "googleapis";

/**
 * Initialize and export the Google Auth client and service clients
 */

const getAuthClient = () => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, "\n").trim();
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      "Missing Google Service Account credentials in environment variables."
    );
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
};

export const auth = getAuthClient();

export const sheets = google.sheets({ version: "v4", auth });

export const drive = google.drive({ version: "v3", auth });

export const MASTER_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!MASTER_FOLDER_ID) {
  console.warn("GOOGLE_DRIVE_FOLDER_ID is not defined in environment variables.");
}
