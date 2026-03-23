import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
import { deleteSpreadsheet } from "@/lib/google/sheets";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const { sheetId } = await req.json();

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 });
    }

    // Verify user has delete permission via Firestore
    const docRef = await adminDb.collection("sheets").doc(sheetId).get();
    if (!docRef.exists) {
       return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const sheetData = docRef.data();
    
    // Only creator or Owner/Head can delete
    const canDelete = decodedToken.uid === sheetData?.createdBy;

    if (!canDelete) {
        const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
        const role = userRef.data()?.role;
        if (role !== "owner" && role !== "head") {
            return NextResponse.json({ error: "Delete permission denied" }, { status: 403 });
        }
    }

    // Call Google Sheets API to move to trash
    await deleteSpreadsheet(sheetData!.googleSheetId);

    // Update isActive to false in Firestore
    await adminDb.collection("sheets").doc(sheetId).update({
        isActive: false,
        deletedAt: new Date(),
        deletedBy: decodedToken.uid
    });

    // Log the deletion
    await adminDb.collection("sheetLogs").add({
      sheetId,
      action: "sheet_deleted",
      performedBy: decodedToken.uid,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting sheet:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
