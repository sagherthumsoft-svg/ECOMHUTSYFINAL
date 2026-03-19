import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { verifyAndGetUser } from "./authHelper";

export const listSheets = onCall(async (request) => {
  const data = request.data;
  const user = await verifyAndGetUser(data, request);
  const isAdmin = ["owner", "manager", "head"].includes(user.role);

  let query = admin
    .firestore()
    .collection("sheets")
    .where("isActive", "==", true);

  // Non-admins only see their assigned sheets
  if (!isAdmin) {
    query = query.where("assignedUsers", "array-contains", user.uid);
  }

  // Optional filter
  const filter = data.filter;
  if (filter === "mySheets") {
    query = query.where("createdBy", "==", user.uid);
  }

  const snap = await query.orderBy("createdAt", "desc").get();
  const sheets = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Client-side search if query provided
  const searchQuery = data.query?.toLowerCase();
  const filtered = searchQuery
    ? sheets.filter((s: any) => (s.name ?? "").toLowerCase().includes(searchQuery))
    : sheets;

  return { sheets: filtered };
});
