// Fix 7 — Auth Wrapper: WarehouseSidebar uses onAuthStateChanged so that
// Firestore queries never run before Firebase Auth is ready.
// Unread: uses localStorage timestamps to track per-warehouse read state.
"use client";

import { useUserStore } from "@/store/userStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { useAppStore } from "@/store/appStore";
import { useEffect, useState, useCallback } from "react";
import { markChatRead } from "@/components/layout/AppBar";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Warehouse } from "@/types";
import { Building2, Loader2, AlertCircle, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function WarehouseSidebar() {
  const { dbUser } = useUserStore();
  const { activeWarehouse, setActiveWarehouse } = useWarehouseStore();
  const { searchQuery, setSearchQuery, setActiveModal } = useAppStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readTick, setReadTick] = useState(0);

  // Helper: is this warehouse unread?
  const isUnread = useCallback(
    (wh: Warehouse & { chatId?: string; updatedAt?: number }) => {
      if (!dbUser?.uid) return false;
      const chatId = wh.chatId || wh.warehouseId;
      const lastSenderId = (wh as any).lastMessageSenderId || "";
      if (!lastSenderId || lastSenderId === dbUser.uid) return false;
      const lastMsgAt: number = wh.lastMessageAt || (wh as any).updatedAt || 0;
      if (!lastMsgAt) return false;
      const lastRead = parseInt(localStorage.getItem(`lastRead_${chatId}`) || "0", 10);
      return lastMsgAt > lastRead;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dbUser?.uid, readTick]
  );

  useEffect(() => {
    // Fix 7: wrap inside onAuthStateChanged — guarantees the user is auth'd
    // before we fire any Firestore query.
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        // Not signed in — clear state and stop loading
        setWarehouses([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const uid = firebaseUser.uid;
      const q = query(
        collection(db, "chats"),
        where("memberIds", "array-contains", uid)
      );

      const unsubSnap = onSnapshot(
        q,
        (snapshot) => {
          const fetched = snapshot.docs
            .map((d) => {
              const data = d.data();
              // Only process warehouse chats
              if (data.type !== "warehouse") return null;

              const createdAt =
                typeof data.createdAt === "number"
                  ? data.createdAt
                  : data.createdAt?.toMillis?.() || Date.now();
              const updatedAt =
                typeof data.updatedAt === "number"
                  ? data.updatedAt
                  : data.updatedAt?.toMillis?.() ||
                    typeof data.lastMessageAt === "number"
                    ? data.lastMessageAt
                    : data.lastMessageAt?.toMillis?.() ||
                      typeof data.lastMessageTime === "number"
                      ? data.lastMessageTime
                      : data.lastMessageTime?.toMillis?.() || createdAt;

              return {
                warehouseId: d.id, // mapped to id for activeWarehouse compatibility
                chatId: d.id,
                name: data.name || data.warehouseName || "Unnamed Warehouse",
                description: data.description || "",
                memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
                createdAt,
                updatedAt,
                createdBy: data.createdBy || "system",
                lastMessage: data.lastMessage || null,
                lastMessageAt: data.lastMessageAt || updatedAt,
                lastMessageSenderId: data.lastMessageSenderId || "",
                type: "warehouse",
              } as Warehouse & { chatId: string; updatedAt: number; type: string };
            })
            .filter(Boolean) as (Warehouse & { chatId: string; updatedAt: number; type: string })[];

          const sorted = fetched.sort(
            (a, b) =>
              (b.lastMessageAt || b.updatedAt) -
              (a.lastMessageAt || a.updatedAt)
          );
          setWarehouses(sorted);
          // Fix 6: always set loading false in success path
          setIsLoading(false);
        },
        (err) => {
          console.error("Warehouse fetch error:", err);
          setError("Could not load warehouses, please refresh.");
          // Fix 6: always set loading false in error path
          setIsLoading(false);
        }
      );

      // Return inner cleanup (runs when auth state changes again)
      return () => unsubSnap();
    });

    // Outer cleanup
    return () => unsubAuth();
  }, [dbUser?.uid]);

  // Listen for 'openChat' event from NotificationsMenu
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      const { type, id } = e.detail;
      if (type === "warehouse" && id) {
        const warehouse = warehouses.find((w) => w.warehouseId === id);
        if (warehouse) {
          setActiveWarehouse(warehouse);
          // Mark as read immediately when navigated
          markChatRead((warehouse as any).chatId || warehouse.warehouseId);
          setReadTick((t) => t + 1);
          window.dispatchEvent(new Event("chatRead"));
        }
      }
    };
    window.addEventListener("openChat", handleOpenChat);
    return () => window.removeEventListener("openChat", handleOpenChat);
  }, [warehouses, setActiveWarehouse, setReadTick]);

  // Force re-render on chatRead event
  useEffect(() => {
    const handleChatRead = () => setReadTick((t) => t + 1);
    window.addEventListener("chatRead", handleChatRead);
    return () => window.removeEventListener("chatRead", handleChatRead);
  }, []);

  const filtered = warehouses.filter((wh) => {
    const name = (wh.name || "").toLowerCase();
    const description = (wh.description || "").toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || description.includes(search);
  });

  const canCreate =
    dbUser?.role === "owner" ||
    dbUser?.role === "manager" ||
    dbUser?.role === "head";

  return (
    <div className="flex flex-col w-full h-full bg-[#111B21] border-r border-[#2A3942] relative">
      <style>{`
        .warehouse-sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .warehouse-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .warehouse-sidebar-scroll::-webkit-scrollbar-thumb { background-color: #2A3942; border-radius: 10px; }
      `}</style>

      {/* Header / Search */}
      <div className="p-3 border-b border-[#2A3942] flex items-center gap-3 bg-[#111B21]">
        <div className="flex-1 flex items-center bg-[#202C33] px-3 py-1.5 rounded-lg h-[35px]">
          <Building2 className="w-4 h-4 text-[#8696A0] shrink-0" />
          <input
            type="text"
            placeholder="Search warehouses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none ml-4 text-sm text-[#D1D7DB] placeholder-[#8696A0]"
          />
        </div>
      </div>

      {/* Floating New Warehouse Button (admin only) */}
      {canCreate && (
        <button
          onClick={() => setActiveModal("createWarehouse")}
          className="absolute bottom-6 right-6 w-14 h-14 bg-[#00A884] hover:bg-[#06CF9C] rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 z-10"
          title="New Warehouse"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
      {/* Content area */}
      <div className="flex-1 overflow-y-auto w-full warehouse-sidebar-scroll">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8696A0]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading warehouses…</span>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-400">Could not load warehouses.</p>
            <p className="text-xs text-[#8696A0]">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center text-[#8696A0] mt-10">
            <Building2 className="w-12 h-12 opacity-20 mb-2" />
            <p className="text-sm">
              {searchQuery ? "No matching warehouses found." : "No warehouses yet."}
            </p>
          </div>
        )}

        {/* Warehouse list */}
        {!isLoading &&
          !error &&
          filtered.map((wh) => {
            const time = wh.lastMessageAt || wh.createdAt;
            const isActive = activeWarehouse?.warehouseId === wh.warehouseId;
            const chatId = (wh as any).chatId || wh.warehouseId;
            const unread = isUnread(wh as any);

            return (
              <div
                key={wh.warehouseId}
                onClick={() => {
                  setActiveWarehouse(wh);
                  markChatRead(chatId);
                  setReadTick((t) => t + 1);
                  window.dispatchEvent(new Event("chatRead"));
                }}
                className={`flex items-center w-full px-3 py-2 cursor-pointer transition-colors border-l-4 ${isActive
                  ? "bg-[#2A3942] border-[#00A884]"
                  : "bg-transparent border-transparent hover:bg-[#202C33]"
                  }`}
              >
                {/* Avatar */}
                <div className="w-14 h-14 flex-shrink-0 bg-[#00A884] rounded-full flex items-center justify-center mr-3 shadow-sm">
                  <Building2 className="w-7 h-7 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-center border-b border-[#2A3942] pb-3 pt-2 h-full overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[17px] font-normal text-[#E9EDEF] truncate">
                      {wh.name}
                    </span>
                    <span className={`text-xs whitespace-nowrap ml-2 shrink-0 ${isActive ? 'text-[#00A884]' : 'text-[#8696A0]'}`}>
                      {(() => {
                        try {
                          if (!time) return ""
                          const date = (time as any)?.toDate
                            ? (time as any).toDate()
                            : new Date(time)
                          if (isNaN(date.getTime())) return ""
                          return formatDistanceToNow(date, { addSuffix: true })
                        } catch {
                          return ""
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`text-sm truncate max-w-[85%] ${unread ? 'text-[#E9EDEF] font-medium' : 'text-[#8696A0]'}`}>
                      {wh.lastMessage ||
                        `${wh.memberIds.length} staff member${wh.memberIds.length !== 1 ? "s" : ""}`}
                    </div>
                    {unread && (
                      <div className="ml-2 shrink-0 min-w-[18px] h-[18px] bg-[#00A884] rounded-full flex items-center justify-center text-[#111B21] text-[10px] font-bold px-1">
                        1                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
