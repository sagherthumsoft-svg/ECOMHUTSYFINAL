import { NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminRole } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
import { getDrive } from "@/lib/google/config";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { sheetId } = await req.json();

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 });
    }

    // Fetch user from Firestore
    const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!userRef.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = userRef.data();
    const userEmail = userData?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }

    // Fetch sheet from Firestore
    const docRef = await adminDb.collection("sheets").doc(sheetId).get();
    if (!docRef.exists) {
       return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }
    const sheetData = docRef.data();

    // Validate access
    const { assignedUsers = [], permissions = {} } = sheetData || {};
    const canEdit = permissions.canEdit || [];
    const canView = permissions.canView || [];
    const isOwner = sheetData?.createdBy === decodedToken.uid;
    const isSuper = isAdminRole(userData?.role);

    const isAuthorized = 
        isSuper ||
        isOwner ||
        assignedUsers.includes(decodedToken.uid) || 
        canEdit.includes(decodedToken.uid) || 
        canView.includes(decodedToken.uid);

    if (!isAuthorized) {
       return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const googleSheetId = sheetData?.googleSheetId;
    if (!googleSheetId) {
       return NextResponse.json({ error: "Google Sheet ID not found" }, { status: 404 });
    }

    // Determine role
    const role = (canEdit.includes(decodedToken.uid) || isOwner || isSuper) ? "writer" : "reader";

    // Grant Google Drive permission
    try {
      const drive = getDrive();
      await drive.permissions.create({
        fileId: googleSheetId,
        requestBody: {
          role: role,
          type: "user",
          emailAddress: userEmail,
        },
      });
    } catch (e: any) {
      // Ignore if permission already exists or handle specific errors safely
      console.warn("Drive permission issue or already exists:", e.message);
    }

    const url = `https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`;

    return NextResponse.json({ url }, { status: 200 });
  } catch (error: any) {
    console.error("Error opening sheet:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
