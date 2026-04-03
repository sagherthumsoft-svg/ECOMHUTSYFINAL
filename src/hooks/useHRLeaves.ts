"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Leave } from "@/types";

export function useHRLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, "leaves"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!isMounted) return;
        try {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Leave[];
          setLeaves(data);
          setLoading(false);
          setError(null);
        } catch (err: any) {
          console.error("useHRLeaves Snapshot Error:", err);
          setError(err.message || "Failed to process leaves data");
        }
      },
      (err) => {
        if (!isMounted) return;
        console.error("useHRLeaves Listener Error:", err);
        setError(err.message || "Failed to load leaves");
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { leaves, loading, error };
}
