"use client";

import { useEffect, ReactNode } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";
import { User } from "@/types";
import toast from "react-hot-toast";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAuthUser, setDbUser, setLoading, clearSession } = useUserStore();

  useEffect(() => {
    // Safety Timeout: Force loading to false after 10 seconds to prevent infinite spinner
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 10000);

    if (!auth) {
      setLoading(false);
      window.clearTimeout(timer);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        if (user) {
          setAuthUser(user);
          try {
            // Fetch the user's role from Firestore
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const userData = { uid: docSnap.id, ...docSnap.data() } as User;
              setDbUser(userData);

              // ── Force password reset on first login ──────────────────────
              if ((docSnap.data() as any).mustChangePassword === true) {
                if (
                  typeof window !== "undefined" &&
                  !window.location.pathname.startsWith("/change-password")
                ) {
                  window.location.replace("/change-password");
                }
              }
            } else {
              // User authenticated but has no Firestore profile.
              await signOut(auth);
              clearSession();
              toast.error("Unauthorized access. No user profile found.");
            }
          } catch (error: any) {
            console.error("Error fetching user profile:", error);
            // Only sign out on true auth/permission failures
            const isPermissionError =
              error?.code === "permission-denied" ||
              error?.message?.includes("Missing or insufficient permissions");
            if (isPermissionError) {
              await signOut(auth);
              clearSession();
              toast.error("Access denied. Please contact your administrator.");
            } else {
              toast.error("Could not load your profile. Please refresh.");
            }
          }
        } else {
          clearSession();
        }
      } finally {
        setLoading(false);
        clearTimeout(timer);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [setAuthUser, setDbUser, setLoading, clearSession]);

  return <>{children}</>;
}
