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
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setAuthUser(user);
        try {
          // Fetch the user's role from Firestore
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setDbUser({ uid: docSnap.id, ...docSnap.data() } as User);
          } else {
            // User authenticated but has no Firestore profile.
            // Since owner is created manually & other users via admin panel, 
            // if this occurs, the user is unauthorized or doc is missing.
            await signOut(auth);
            clearSession();
            toast.error("Unauthorized access. No user profile found.");
          }
        } catch (error: any) {
          console.error("Error fetching user profile:", error);
          // Only sign out on true auth/permission failures, not transient errors
          const isPermissionError =
            error?.code === "permission-denied" ||
            error?.message?.includes("Missing or insufficient permissions");
          if (isPermissionError) {
            await signOut(auth);
            clearSession();
            toast.error("Access denied. Please contact your administrator.");
          } else {
            // Transient error — keep session, just warn
            toast.error("Could not load your profile. Please refresh.");
            setLoading(false);
          }
        }
      } else {
        clearSession();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setAuthUser, setDbUser, setLoading, clearSession]);

  return <>{children}</>;
}
