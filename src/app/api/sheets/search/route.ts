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
    
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    // In Firestore, textual search is limited. Ideally, this should use frontend filtering via onSnapshot or Algolia.
    // For this demonstration backend function, we'll fetch list and filter in memory.
    const snapshot = await adminDb.collection("sheets").where("isActive", "==", true).get();
    
    const sheets: any[] = [];
    const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
    const role = userRef.data()?.role;
    const isSuper = isAdminRole(role);

    const searchLower = query.toLowerCase();

    snapshot.forEach(doc => {
       const data = doc.data();
       const hasAccess = isSuper || data.assignedUsers?.includes(decodedToken.uid) || data.permissions?.canView?.includes(decodedToken.uid) || data.permissions?.canEdit?.includes(decodedToken.uid) || data.createdBy === decodedToken.uid;
       
       if (hasAccess && data.name?.toLowerCase().includes(searchLower)) {
           sheets.push({ id: doc.id, ...data });
       }
    });

    return NextResponse.json({ success: true, count: sheets.length, sheets }, { status: 200 });
  } catch (error: any) {
    console.error("Error searching sheets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
