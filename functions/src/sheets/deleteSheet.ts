import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { verifyAndGetUser, requireOwner, logAuditEvent } from "./authHelper";

export const deleteSheet = onCall(async (request) => {
  const data = request.data;
  const user = await verifyAndGetUser(data, request);
  const { sheetId, action } = data;

  // Export action — admin only
  if (action === "export") {
    const isAdmin = ["owner", "manager", "head"].includes(user.role);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin only.");
    }

    const sheetDoc = await admin.firestore().collection("sheets").doc(sheetId).get();
    if (!sheetDoc.exists) {
      throw new HttpsError("not-found", "Sheet not found.");
    }

    const googleSheetId = sheetDoc.data()!.googleSheetId;
    const exportUrl = `https://docs.google.com/spreadsheets/d/${googleSheetId}/export?format=csv`;

    await logAuditEvent(sheetId, "sheet_exported", user.uid, user.fullName, {});
    return { success: true, downloadUrl: exportUrl };
  }

  // Delete — Owner only
  requireOwner(user);

  await admin.firestore().collection("sheets").doc(sheetId).update({
    isActive: false,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAuditEvent(sheetId, "sheet_deleted", user.uid, user.fullName, {});
  return { success: true };
});
