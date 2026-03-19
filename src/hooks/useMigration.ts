/**
 * useMigration — Fix 1 (Data Migration)
 *
 * Runs once (per browser) when the owner logs in.
 * Fetches ALL documents from chats, groups, warehouses collections and ensures
 * the owner's UID is present in the memberIds array of every document.
 * This fixes existing data that was created before the Firestore security
 * rules required the memberIds field.
 */

"use client";

import { useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const MIGRATION_KEY = "migrationDone_v1";
const COLLECTIONS = ["chats", "groups", "warehouses"] as const;

export function useMigration(uid: string | undefined, role: string | undefined) {
  useEffect(() => {
    // Only run for admin roles
    const isAdmin = role && ["owner", "manager", "head"].includes(role);
    if (!uid || !isAdmin) return;

    // Only run once per user per browser session
    const syncKey = `adminSyncDone_${uid}`;
    if (typeof window !== "undefined" && localStorage.getItem(syncKey)) {
      return;
    }

    const runMigration = async () => {
      console.log(`[Migration] Starting memberIds sync for roles [${role}] (User: ${uid})`);
      let totalUpdated = 0;

      for (const col of COLLECTIONS) {
        try {
          const snapshot = await getDocs(collection(db, col));
          const updates: Promise<void>[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const memberIds: string[] = Array.isArray(data.memberIds)
              ? data.memberIds
              : [];

            if (!memberIds.includes(uid)) {
              // This document is missing the owner UID — patch it
              updates.push(
                updateDoc(doc(db, col, docSnap.id), {
                  memberIds: arrayUnion(uid),
                })
              );
              totalUpdated++;
            }
          });

          if (updates.length > 0) {
            await Promise.all(updates);
            console.log(
              `[Migration] Synced ${updates.length} docs in "${col}"`
            );
          }
        } catch (err) {
          console.error(`[Migration] Error processing "${col}":`, err);
        }
      }

      // Mark sync complete for this session/user
      localStorage.setItem(syncKey, "true");
      console.log(
        `[Migration] Finished sync — ${totalUpdated} document(s) updated.`
      );
    };

    runMigration();
  }, [uid, role]);
}
