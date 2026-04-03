import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection("pending_users")
      .where("personalEmail", "==", email)
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    const data = snapshot.docs[0].data();
    return NextResponse.json({
      found: true,
      status: data.status,
      rejectionReason: data.rejectionReason || null,
      submissionId: snapshot.docs[0].id,
      submittedAt: data.submittedAt,
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
