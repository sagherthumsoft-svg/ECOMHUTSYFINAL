import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Verifies the caller's Firebase ID token and returns their role.
 * Throws HttpsError if unauthenticated or unauthorized.
 */
export async function verifyAndGetUser(data: any, context: any) {
  // Verify Firebase Auth context
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Authentication required. Please sign in.");
  }

  const uid = context.auth.uid;

  // Fetch user document from Firestore
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const userData = userDoc.data()!;
  if (userData["isActive"] === false) {
    throw new HttpsError("permission-denied", "Account has been deactivated.");
  }

  return {
    uid,
    email: context.auth.token.email ?? "",
    role: userData["role"] ?? "team_member",
    fullName: userData["fullName"] ?? "",
  };
}

/**
 * Ensures caller is an admin role (owner, manager, or head).
 */
export function requireAdmin(user: any) {
  const adminRoles = ["owner", "manager", "head"];
  if (!adminRoles.includes(user.role)) {
    throw new HttpsError("permission-denied", "Admin role required for this operation.");
  }
}

/**
 * Ensures caller is Owner (highest privilege).
 */
export function requireOwner(user: any) {
  if (user.role !== "owner") {
    throw new HttpsError("permission-denied", "Owner role required for this operation.");
  }
}

/**
 * Logs an audit event to sheetAuditLogs collection.
 */
export async function logAuditEvent(
  sheetId: string,
  action: string,
  performedBy: string,
  performedByName: string,
  metadata?: any
) {
  await admin.firestore().collection("sheetAuditLogs").add({
    sheetId,
    action,
    performedBy,
    performedByName,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata,
  });
}
