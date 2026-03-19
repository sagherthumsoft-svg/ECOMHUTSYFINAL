import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createSpreadsheet } from "@/lib/google/sheets";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const dbUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!dbUserSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dbUser = dbUserSnap.data();
    const userEmail = decodedToken.email; // Get email from decoded token

    const { name, templateType, assignedUsers = [], assignedGroups = [], permissions = { canEdit: [], canView: [] } } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Sheet name is required" }, { status: 400 });
    }

    // Determine Template Data
    let templateData: any[][] = [];
    if (templateType === "Orders") {
      templateData = [["Order ID", "Date", "Product", "Quantity", "Price", "Status", "Warehouse", "Notes"]];
    } else if (templateType === "Inventory") {
      templateData = [["SKU", "Product Name", "Category", "Quantity", "Unit", "Location", "Last Updated", "Notes"]];
    } else if (templateType === "Sales") {
      templateData = [["Date", "Sales Rep", "Product", "Units Sold", "Revenue", "Region", "Notes"]];
    } else if (templateType === "Custom") {
      templateData = [["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"]];
    }

    // Connect to Google Sheets & Create Master File
    // Pass userEmail to share it with the creator
    const googleSheetId = await createSpreadsheet(name, userEmail, templateData);

    // Ensure Creator has edit permissions implicitly in Firestore
    const canEdit = new Set([...permissions.canEdit, decodedToken.uid]);
    const canView = new Set([...permissions.canView, decodedToken.uid]);

    // Save to Firestore
    const sheetData = {
      name,
      googleSheetId,
      createdBy: decodedToken.uid,
      createdByName: dbUser?.name || "Unknown",
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      assignedUsers: Array.from(new Set([...assignedUsers, decodedToken.uid])),
      assignedGroups,
      permissions: {
        canEdit: Array.from(canEdit),
        canView: Array.from(canView)
      },
      isActive: true,
      templateType
    };

    const docRef = await adminDb.collection("sheets").add(sheetData);

    // Log the creation
    await adminDb.collection("sheetLogs").add({
      sheetId: docRef.id,
      action: "sheet_created",
      performedBy: decodedToken.uid,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true, id: docRef.id, googleSheetId }, { status: 200 });
  } catch (error: any) {
    console.error("Error creating sheet:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
