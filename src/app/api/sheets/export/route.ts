import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getSheetData, exportSheet } from "@/lib/google/sheets";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const { sheetId, format = "csv" } = await req.json();

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 });
    }

    // Verify user has permission to view this sheet
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
        const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
        const role = userRef.data()?.role;
        if (role !== "owner" && role !== "head") {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }
    }

    // For CSV Export, we can easily generate it from the Array of Arrays or use Google's export
    // Using Google's export for consistency across PDF/XLSX/CSV
    if (format === "csv" || format === "pdf" || format === "xlsx") {
        const data = await exportSheet(sheetData.googleSheetId, format);
        const buffer = Buffer.from(data as ArrayBuffer);
        
        let contentType = "text/csv";
        if (format === "pdf") contentType = "application/pdf";
        if (format === "xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${sheetData.name}.${format}"`
            }
        });
    }

    return NextResponse.json({ error: "Invalid format. Supported formats: csv, pdf, xlsx" }, { status: 400 });
  } catch (error: any) {
    console.error("Error exporting sheet data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
