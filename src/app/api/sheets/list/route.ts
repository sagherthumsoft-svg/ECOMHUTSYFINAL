import { NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminRole } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // List all active sheets
    const snapshot = await adminDb.collection("sheets").where("isActive", "==", true).get();
    
    // In a real app we would do role based filtering here, but we can do that on frontend using onSnapshot
    // For completeness, we return all, or just assigned ones
    const sheets: any[] = [];
    
    const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
    const role = userRef.data()?.role;
    const isSuper = isAdminRole(role);

    snapshot.forEach(doc => {
       const data = doc.data();
       if (isSuper || data.assignedUsers?.includes(decodedToken.uid) || data.permissions?.canView?.includes(decodedToken.uid) || data.permissions?.canEdit?.includes(decodedToken.uid) || data.createdBy === decodedToken.uid) {
           sheets.push({ id: doc.id, ...data });
       }
    });

    return NextResponse.json({ success: true, count: sheets.length, sheets }, { status: 200 });
  } catch (error: any) {
    console.error("Error listing sheets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
