import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

// Verify the request is from an authenticated HR/admin user
async function verifyHRUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    // Check role in Firestore
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

function generateSecurePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$!&";
  const all = upper + lower + digits + special;

  let password = 
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

export async function POST(req: NextRequest) {
  const hrUid = await verifyHRUser(req);
  if (!hrUid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await req.json();
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
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

    // Generate credentials
    const tempPassword = generateSecurePassword();

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: pending.personalEmail,
      password: tempPassword,
      displayName: pending.fullName,
      photoURL: pending.profileImageUrl || undefined,
    });

    // Generate employee ID
    const counterRef = adminDb.collection("settings").doc("hrCounters");
    let employeeId = `EMP-${Date.now().toString().slice(-6)}`;
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists ? (snap.data()?.employeeCount ?? 0) : 0;
      const next = current + 1;
      tx.set(counterRef, { employeeCount: next }, { merge: true });
      employeeId = `EMP-${String(next).padStart(4, "0")}`;
    });

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Create Firestore user document
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      id: userRecord.uid,
      employeeId,
      fullName: pending.fullName,
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.personalEmail,
      name: pending.fullName,
      photoURL: pending.profileImageUrl || null,
      profileImageUrl: pending.profileImageUrl || null,

      dateOfBirth: pending.dateOfBirth,
      cnic: pending.cnic,
      mobileNumber: pending.mobileNumber,
      address: pending.address,

      designation: pending.designation,
      reportingManager: pending.reportingManager,
      teamName: pending.teamName,
      dateOfJoining: pending.dateOfJoining,
      bankName: pending.bankName,
      ibanNumber: pending.ibanNumber,

      guardianName: pending.guardianName,
      guardianCnic: pending.guardianCnic,
      guardianMobileNumber: pending.guardianMobileNumber,
      guardianAddress: pending.guardianAddress,
      emergencyContactNumber: pending.emergencyContactNumber,

      // Document URLs
      cnicCopyUrl: pending.cnicCopyUrl,
      guardianCnicCopyUrl: pending.guardianCnicCopyUrl,
      lastDegreeCertificateUrl: pending.lastDegreeCertificateUrl,
      employmentFormUrl: pending.employmentFormUrl,
      employmentContractUrl: pending.employmentContractUrl,
      professionalPictureUrl: pending.professionalPictureUrl,

      role: "team_member",
      isActive: true,
      isOnline: false,
      mustChangePassword: true,
      submissionId,
      createdAt: now,
    });

    // Update pending_users status
    await pendingRef.update({
      status: "approved",
      approvedBy: hrUid,
      approvedAt: Date.now(),
      generatedUid: userRecord.uid,
    });

    // Send welcome email via internal API
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send-approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: pending.personalEmail,
        name: pending.fullName,
        employeeId,
        tempPassword,
      }),
    }).catch((e) => console.warn("Email send failed (non-critical):", e));

    return NextResponse.json({ success: true, uid: userRecord.uid, employeeId });
  } catch (error: any) {
    console.error("Approve user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
