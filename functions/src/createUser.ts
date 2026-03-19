import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const createUser = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in as admin");
  }

  const data = request.data;
  const email = data.email;
  const password = data.password;
  const fullName = data.fullName;
  const phoneNumber = data.phoneNumber;
  const role = data.role;

  if (!email || !password || !fullName) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    // Create Firestore document
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      fullName: fullName,
      email: email,
      phoneNumber: phoneNumber ?? "",
      role: role ?? "user",
      isOnline: false,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      uid: userRecord.uid,
      success: true,
    };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});
