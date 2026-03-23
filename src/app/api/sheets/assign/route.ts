import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
import { getDrive } from "@/lib/google/config";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const { sheetId, assignedUsers, assignedGroups, permissions } = await req.json();

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 });
    }

    // 1. Verify user has assign permission (creator, owner, head, manager)
    const docRef = await adminDb.collection("sheets").doc(sheetId).get();
    if (!docRef.exists) {
       return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const sheetData = docRef.data();
    const canAssign = decodedToken.uid === sheetData?.createdBy;

    if (!canAssign) {
        const userRef = await adminDb.collection("users").doc(decodedToken.uid).get();
        const role = userRef.data()?.role;
        if (role !== "owner" && role !== "head" && role !== "manager") {
            return NextResponse.json({ error: "Assign permission denied" }, { status: 403 });
        }
    }

    const googleSheetId = sheetData?.googleSheetId;

    // 2. Sync Drive Permissions
    // For each user in permissions, we should ensure they have Drive access
    // This part is complex because we need their emails.
    // We'll fetch emails for all unique UIDs in canEdit and canView.
    const allUserIds = Array.from(new Set([
      ...(permissions?.canEdit || []),
      ...(permissions?.canView || []),
      ...(assignedUsers || [])
    ]));

    if (googleSheetId && allUserIds.length > 0) {
      const usersSnap = await adminDb.collection("users").where("__name__", "in", allUserIds).get();
      const usersByEmail = usersSnap.docs.map(doc => ({ id: doc.id, email: doc.data().email }));

      for (const user of usersByEmail) {
        if (!user.email) continue;
        
        try {
          const drive = getDrive();
          const role = (permissions?.canEdit || []).includes(user.id) ? "writer" : "reader";
          
          await drive.permissions.create({
            fileId: googleSheetId,
            requestBody: {
              role: role,
              type: "user",
              emailAddress: user.email,
            },
          });
        } catch (e) {
          console.warn(`Could not sync Drive permission for ${user.email}:`, e);
        }
      }
    }

    // 3. Update Firestore state
    const finalPermissions = {
       canEdit: Array.from(new Set([...(permissions?.canEdit || []), sheetData!.createdBy])),
       canView: Array.from(new Set([...(permissions?.canView || []), sheetData!.createdBy]))
    };

    const finalUsers = Array.from(new Set([...(assignedUsers || []), sheetData!.createdBy]));

    await adminDb.collection("sheets").doc(sheetId).update({
        assignedUsers: finalUsers,
        assignedGroups: assignedGroups || [],
        permissions: finalPermissions,
        lastUpdatedAt: new Date()
    });

    // 4. Log the update
    await adminDb.collection("sheetLogs").add({
      sheetId,
      action: "sheet_assigned",
      performedBy: decodedToken.uid,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error assigning sheet:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
