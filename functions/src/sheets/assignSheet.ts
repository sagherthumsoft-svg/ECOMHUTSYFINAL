import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { verifyAndGetUser, requireAdmin, logAuditEvent } from "./authHelper";

export const assignSheet = onCall(async (request) => {
  const data = request.data;
  const user = await verifyAndGetUser(data, request);
  requireAdmin(user);

  const {
    sheetId,
    assignedUsers,
    assignedGroups,
    assignedWarehouses,
    canEdit,
    canView,
  } = data;

  await admin.firestore().collection("sheets").doc(sheetId).update({
    assignedUsers,
    assignedGroups,
    assignedWarehouses,
    "permissions.canEdit": canEdit || [],
    "permissions.canView": canView || [],
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAuditEvent(sheetId, "sheet_assigned", user.uid, user.fullName, {
    assignedUsers,
    canEdit,
    canView,
  });

  return { success: true };
});
