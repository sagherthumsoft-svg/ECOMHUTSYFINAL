import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMUvB2ORNvWVHG-jjD_VAijXFhMwS5T3c",
  authDomain: "ecomhutsyfinal.firebaseapp.com",
  projectId: "ecomhutsyfinal",
  storageBucket: "ecomhutsyfinal.firebasestorage.app",
  messagingSenderId: "383627418318",
  appId: "1:383627418318:web:d432f2ff5593520e41ce9f",
  measurementId: "G-HGNYS9PV09"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Use initializeFirestore with long polling
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const storage = getStorage(app);

// Analytics and Messaging initialized dynamically on client only
let analytics: any = null;
let messaging: any = null;

if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
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

export { app, auth, db, storage, messaging, analytics, googleProvider };
