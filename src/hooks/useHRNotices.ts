"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notice } from "@/types";

export function useHRNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!isMounted) return;
        try {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Notice[];
          setNotices(data);
          setLoading(false);
          setError(null);
        } catch (err: any) {
          console.error("useHRNotices Snapshot Error:", err);
          setError(err.message || "Failed to process notices data");
        }
      },
      (err) => {
        if (!isMounted) return;
        console.error("useHRNotices Listener Error:", err);
        setError(err.message || "Failed to load notices");
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { notices, loading, error };
}
