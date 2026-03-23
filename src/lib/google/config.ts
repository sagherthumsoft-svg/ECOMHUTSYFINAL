import { google } from "googleapis";

/**
 * Initialize and export the Google Auth client and service clients on demand
 */

let auth: any = null;
let sheets: any = null;
let drive: any = null;

const getAuthClient = () => {
  if (auth) return auth;

  const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let clientEmail, privateKey;

  if (firebaseKey) {
    try {
      const parsed = JSON.parse(firebaseKey);
      clientEmail = parsed.client_email;
      privateKey = parsed.private_key?.replace(/\\n/g, "\n");
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY for Google Auth", e);
    }
  }

  // Fallback to separate env vars
  if (!clientEmail || !privateKey) {
    privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, "\n").trim();
    clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  }

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Missing Google Service Account credentials in environment variables."
    );
  }

  auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
  return auth;
};

export const getSheets = () => {
  if (!sheets) {
    sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  }
  return sheets;
};

export const getDrive = () => {
  if (!drive) {
    drive = google.drive({ version: "v3", auth: getAuthClient() });
  }
  return drive;
};

export const MASTER_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!MASTER_FOLDER_ID && process.env.NODE_ENV !== 'production') {
  console.warn("GOOGLE_DRIVE_FOLDER_ID is not defined in environment variables.");
}
