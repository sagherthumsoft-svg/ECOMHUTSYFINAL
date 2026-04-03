import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

async function verifyHRUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (["hr_manager", "admin", "owner"].includes(role)) {
      return decoded.uid;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const hrUid = await verifyHRUser(req);
  if (!hrUid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId, reason } = await req.json();
  if (!submissionId || !reason) {
    return NextResponse.json({ error: "submissionId and reason are required" }, { status: 400 });
  }

  try {
    const pendingRef = adminDb.collection("pending_users").doc(submissionId);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      return NextResponse.json({ error: "Pending user not found" }, { status: 404 });
    }

    const pending = pendingSnap.data()!;

    if (pending.status !== "pending") {
      return NextResponse.json({ error: "Application is not in pending state" }, { status: 400 });
    }

    // Update status
    await pendingRef.update({
      status: "rejected",
      rejectionReason: reason,
      rejectedBy: hrUid,
      rejectedAt: Date.now(),
    });

    // Send rejection email
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send-rejection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: pending.personalEmail,
        name: pending.fullName,
        reason,
      }),
    }).catch((e) => console.warn("Rejection email failed (non-critical):", e));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reject user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
