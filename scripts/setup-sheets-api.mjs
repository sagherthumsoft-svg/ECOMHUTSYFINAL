import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function setup() {
  console.log("=============================================");
  console.log("🚀 EcomHutsy Google Sheets API Setup Script");
  console.log("=============================================\n");
  
  const saPath = path.join(rootDir, 'service-account.json');
  
  if (!fs.existsSync(saPath)) {
    console.log("❌ ERROR: 'service-account.json' not found in the root directory.");
    console.log("\nPlease follow these steps:");
    console.log("1. Go to Google Cloud Console (https://console.cloud.google.com/)");
    console.log("2. Open your Firebase project (or create a new GCP project)");
    console.log("3. Enable 'Google Sheets API' and 'Google Drive API'");
    console.log("4. Go to IAM & Admin > Service Accounts");
    console.log("5. Create a Service Account (e.g., 'sheets-manager')");
    console.log("6. Create and Download a JSON Key for this Service Account");
    console.log("7. Rename the downloaded file to 'service-account.json' and place it in the root of your project");
    console.log("8. Run this script again: 'node scripts/setup-sheets-api.mjs'\n");
    process.exit(1);
  }

  console.log("✅ Found service-account.json");
  const saContent = JSON.parse(fs.readFileSync(saPath, 'utf8'));

  console.log("🔄 Authenticating with Google...");
  const auth = new google.auth.GoogleAuth({
    keyFile: saPath,
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
  });

  const drive = google.drive({ version: 'v3', auth });

  console.log("📁 Creating Master Folder in Google Drive...");
  
  try {
    const folderMetadata = {
      name: 'EcomHutsy Sheets Master Workspace',
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    const folder = await drive.files.create({
      resource: folderMetadata,
      supportsAllDrives: true,
      fields: 'id',
    });
    
    const folderId = folder.data.id;
    console.log(`✅ Master Folder created with ID: ${folderId}`);

    console.log("\n📝 Updating .env.local...");
    const envPath = path.join(rootDir, '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const newVars = `
# Google Sheets & Drive API Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL="${saContent.client_email}"
GOOGLE_PRIVATE_KEY="${saContent.private_key.replace(/\\n/g, '\\\\n')}"
GOOGLE_DRIVE_MASTER_FOLDER_ID="${folderId}"
`;

    fs.appendFileSync(envPath, newVars);
    console.log("✅ Successfully appended variables to .env.local");
    
    console.log("\n🔒 Adding service-account.json to .gitignore...");
    const gitignorePath = path.join(rootDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        if (!gitignoreContent.includes('service-account.json')) {
            fs.appendFileSync(gitignorePath, '\n# Google Service Account Key\nservice-account.json\n');
        }
    }
    
    console.log("\n🎉 Setup Complete! You can now safely delete 'service-account.json' or leave it to be ignored by git.");
    console.log("\n⚠️ IMPORTANT: To view the Sheets from your personal Google Drive (optional), you must share the master folder 'EcomHutsy Sheets Master Workspace' to your personal email address. Otherwise, the sheets will be safely stored in the service account's drive and accessed solely via the Web App.");
    
  } catch (error) {
    console.error("❌ Failed to set up Google Drive.", error.message);
  }
}

setup();
