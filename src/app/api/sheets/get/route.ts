import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
import { getSheetData } from "@/lib/google/sheets";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const { sheetId, range = "Sheet1" } = await req.json();

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 });
    }

    // Verify user has permission to access this sheet via Firestore
    const docRef = await adminDb.collection("sheets").doc(sheetId).get();
    if (!docRef.exists) {
       return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const sheetData = docRef.data();
    if (!sheetData?.isActive) {
       return NextResponse.json({ error: "Sheet has been deleted" }, { status: 400 });
    }

    const { permissions, createdBy } = sheetData!;
    const hasAccess = 
      decodedToken.uid === createdBy || 
      permissions?.canView?.includes(decodedToken.uid) || 
      permissions?.canEdit?.includes(decodedToken.uid);

    if (!hasAccess) {
        // Checking role just in case
        const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
        const role = userRef.data()?.role;
        if (role !== "owner" && role !== "head") {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }
    }

    // Call Google Sheets API
    const data = await getSheetData(sheetData.googleSheetId, range);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error("Error getting sheet data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
