import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { updateSheetData } from "@/lib/google/sheets";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const { sheetId, range = "Sheet1", values } = await req.json();

    if (!sheetId || !values) {
      return NextResponse.json({ error: "Sheet ID and values are required" }, { status: 400 });
    }

    // Verify user has edit permission via Firestore
    const docRef = await adminDb.collection("sheets").doc(sheetId).get();
    if (!docRef.exists) {
       return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const sheetData = docRef.data();
    if (!sheetData?.isActive) {
       return NextResponse.json({ error: "Sheet has been deleted" }, { status: 400 });
    }

    const { permissions, createdBy } = sheetData!;
    const canEdit = decodedToken.uid === createdBy || permissions?.canEdit?.includes(decodedToken.uid);

    if (!canEdit) {
        const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
        const role = userRef.data()?.role;
        if (role !== "owner" && role !== "head") {
            return NextResponse.json({ error: "Edit permission denied" }, { status: 403 });
        }
    }

    // Call Google Sheets API
    await updateSheetData(sheetData.googleSheetId, range, values);

    // Update lastUpdatedAt in Firestore
    await adminDb.collection("sheets").doc(sheetId).update({
        lastUpdatedAt: new Date()
    });

    // Log the update
    await adminDb.collection("sheetLogs").add({
      sheetId,
      action: "sheet_updated",
      performedBy: decodedToken.uid,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating sheet data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
