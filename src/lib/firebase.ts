import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate config before initialization
const isConfigValid = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

// Initialize Firebase only if in browser and config is valid
const app = (typeof window !== "undefined" && isConfigValid)
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null as any;

const auth = app ? getAuth(app) : null as any;

// Use initializeFirestore with long polling
const db = app ? initializeFirestore(app, {
  experimentalForceLongPolling: true,
}) : null as any;

const storage = app ? getStorage(app) : null as any;

// Messaging initialized dynamically on client only
let messaging: any = null;
if (typeof window !== "undefined" && app) {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  }).catch(err => {
    console.warn("Firebase Messaging support check failed:", err.message);
  });
}

// Safely create Google Auth Provider
let googleProvider: any = null;
if (typeof window !== "undefined") {
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });
}

export { app, auth, db, storage, messaging, googleProvider };
