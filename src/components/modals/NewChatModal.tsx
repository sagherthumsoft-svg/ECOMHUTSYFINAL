"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { Chat, User } from "@/types";
import { Loader2, Search, X, AlertCircle, RefreshCw } from "lucide-react"; // FIXED: Added icons for error UI
import toast from "react-hot-toast";

export default function NewChatModal() {
  const { activeModal, setActiveModal } = useAppStore();
  const { dbUser } = useUserStore();
  const { setActiveChat } = useChatStore();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null); // FIXED: Added explicit error state

  const isOpen = activeModal === "newChat";

  // FIXED: Use a ref to prevent overlapping or duplicate fetches during re-renders
  const isFetchingRef = useRef(false);

  // FIXED: Abstracted fetch into useCallback to allow manual retries and proper dependency tracking
  const fetchUsers = useCallback(async () => {
    if (isFetchingRef.current) return;

    // FIXED: Properly handle the case when dbUser is not yet available
    // and fallback to auth.currentUser?.uid if Firestore doc misses it
    const currentUserUid = dbUser?.uid || auth.currentUser?.uid;

    if (!currentUserUid) {
      setLoading(true); // Keep loading until dbUser populates
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, "users"), limit(50));

      // FIXED: Added 10-second timeout to prevent indefinite spinner if Firestore hangs (e.g. offline/throttled)
      const fetchPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("fetch_timeout")), 10000)
      );

      const snapshot = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<ReturnType<typeof getDocs>>;

      const allUsers = snapshot.docs
        .map((doc) => {
          const data = doc.data() as Record<string, any>;
          return {
            uid: doc.id,
            ...data,
            name: data.fullName || data.name || data.email || "User",
          } as User;
        })
        .filter((u) => u.uid !== currentUserUid); // FIXED: avoid depending directly on dbUser.uid

      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      // FIXED: User-friendly error messages mapped from Firebase errors
      if (err?.message === "fetch_timeout") {
        setError("Connection request timed out. Please check your internet.");
      } else if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        setError("Permission denied. You may need to sign in again.");
      } else if (err?.code === "resource-exhausted") {
        setError("Quota exceeded. Please try again later.");
      } else {
        setError("Could not load users. Please try again.");
      }
    } finally {
      // FIXED: Ensure loading is always stopped and fetching lock is released
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [dbUser?.uid]);

  // Fetch all users except current user
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    } else {
      // FIXED: Clean up modal state when closed so it resets next time it's opened
      setSearch("");
      setError(null);
      setUsers([]);
      setFilteredUsers([]);
      isFetchingRef.current = false;
    }
  }, [isOpen, fetchUsers]);

  // Filter users by search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
    } else {
      const lower = search.toLowerCase();
      setFilteredUsers(
        users.filter((u) => u.name?.toLowerCase().includes(lower))
      );
    }
  }, [search, users]);

  const handleSelectUser = async (otherUser: User) => {
    const currentUserUid = dbUser?.uid || auth.currentUser?.uid;
    if (!currentUserUid) {
      toast.error("You must be logged in to start a chat");
      return;
    }

    setCreating(true);
    try {
      // FIXED: Sort member IDs to ensure consistent query and existing chat check
      const memberIds = [currentUserUid, otherUser.uid].sort();

      // 1. Check if a chat already exists between current user and selected user
      const chatsRef = collection(db, "chats");
      // Improved query: check if current user is a member
      const q = query(
        chatsRef,
        where("type", "==", "direct"),
        where("memberIds", "array-contains", currentUserUid)
      );
      
      const snapshot = await getDocs(q);

      const existingChatDoc = snapshot.docs.find((doc) => {
        const data = doc.data();
        const docMemberIds = data.memberIds || [];
        return (
          docMemberIds.length === 2 &&
          docMemberIds.includes(otherUser.uid) &&
          data.type === "direct"
        );
      });

      if (existingChatDoc) {
        const data = existingChatDoc.data();
        const existingChat: Chat = {
          chatId: existingChatDoc.id,
          memberIds: data.memberIds || [],
          type: data.type,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
          lastMessage: data.lastMessage
            ? {
                text: data.lastMessage.text,
                createdAt: data.lastMessage.createdAt?.toMillis?.() || data.lastMessage.createdAt || Date.now(),
                senderId: data.lastMessage.senderId,
                messageType: data.lastMessage.messageType,
              }
            : undefined,
          lastMessageTime: data.lastMessageTime?.toMillis?.() || data.lastMessageTime || undefined,
          lastMessageSenderId: data.lastMessageSenderId || undefined,
        };

        console.log("Found existing chat:", existingChat.chatId);
        // Open existing chat
        setActiveChat(existingChat);
        toast.success("Chat opened");
      } else {
        console.log("Creating new chat with members:", memberIds);
        // 2. Create new chat
        const newChatData = {
          memberIds,
          type: "direct",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: null,
          lastMessageTime: null,
          lastMessageSenderId: null,
        };

        const newChatRef = await addDoc(collection(db, "chats"), newChatData);

        const newChat: Chat = {
          chatId: newChatRef.id,
          memberIds,
          type: "direct",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastMessage: undefined,
          lastMessageTime: undefined,
          lastMessageSenderId: undefined,
        };
        setActiveChat(newChat);
        toast.success("Chat started");
      }

      // Close modal
      setActiveModal(null);
    } catch (error: any) {
      console.error("Error creating/finding chat:", error);
      // Detailed error logging for debugging
      if (error?.code === "permission-denied") {
        toast.error("Permission denied. Check Firestore rules.");
      } else {
        toast.error(`Failed to start chat: ${error.message || "Unknown error"}`);
      }
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f2c33] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#2a3942] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942] shrink-0">
          <h3 className="text-lg font-semibold text-white">New Chat</h3>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1 hover:bg-[#2a3942] rounded-full transition"
          >
            <X className="w-5 h-5 text-[#8696a0]" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 shrink-0">
          <div className="flex items-center bg-[#2a3942] rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-[#8696a0] mr-2" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white placeholder-[#8696a0] w-full text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* User list */}
        <div className="overflow-y-auto px-2 pb-4 flex-1">
          {/* FIXED: Added a dedicated error UI with retry action */}
          {error ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-[#8696a0] text-sm mb-4">{error}</p>
              <button
                onClick={fetchUsers}
                className="flex items-center gap-2 bg-[#00a884] hover:bg-[#008f6f] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#00a884] mb-3" />
              <p className="text-[#8696a0] text-sm">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-[#8696a0] text-sm">
              {search ? "No users found" : "No other users available"}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.uid}
                onClick={() => handleSelectUser(user)}
                disabled={creating}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#2a3942] rounded-xl transition disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-white font-medium truncate">{user.name}</div>
                  <div className="text-xs text-[#8696a0] truncate">
                    {user.email || user.role || "User"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}