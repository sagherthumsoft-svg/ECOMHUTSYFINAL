// Fix 7 — Auth Wrapper: ChatSidebar uses onAuthStateChanged so that
// Firestore queries never run before Firebase Auth is ready.
// Unread: uses localStorage timestamps to track per-chat read state.
// Fix 6 — Loading State: setIsLoading(false) in BOTH success AND error paths.
"use client";

import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { useAppStore } from "@/store/appStore";
import { useEffect, useState, useCallback } from "react";
import { markChatRead } from "@/components/layout/AppBar";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Chat, User } from "@/types";
import {
  Search,
  User as UserIcon,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ChatSidebar() {
  const { dbUser } = useUserStore();
  const { activeChat, setActiveChat, searchQuery, setSearchQuery } = useChatStore();
  const { setActiveModal } = useAppStore();
  const [chats, setChats] = useState<(Chat & { otherUser?: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // readTick forces recalculation when a chat is marked read
  const [readTick, setReadTick] = useState(0);

  // Fix 1: Cache for fetched user profiles
  const [userProfiles, setUserProfiles] = useState<Record<string, User>>({});

  // Helper: is a chat unread?
  const isUnread = useCallback(
    (chat: Chat & { otherUser?: User } & { lastMessageSenderId?: string; lastMessageAt?: any; updatedAt?: number }) => {
      if (!dbUser?.uid) return false;
      const lastSenderId = (chat as any).lastMessageSenderId ||
        (typeof chat.lastMessage === "object" ? (chat.lastMessage as any)?.senderId : "");
      // Not unread if I sent the last message
      if (lastSenderId === dbUser.uid) return false;
      // Not unread if there's no last message
      if (!lastSenderId) return false;
      const lastMsgAt: number = (chat as any).updatedAt || (chat as any).lastMessageAt || 0;
      if (!lastMsgAt) return false;
      const lastRead = parseInt(localStorage.getItem(`lastRead_${chat.chatId}`) || "0", 10);
      return lastMsgAt > lastRead;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dbUser?.uid, readTick]
  );

  useEffect(() => {
    if (!auth || !db) {
      setIsLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        // Not signed in — clear state and stop loading
        setChats([]);
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
        async (snapshot) => {
          const fetchedChats = snapshot.docs.map((d) => {
            const data = d.data();
            const memberIds = Array.isArray(data.memberIds)
              ? data.memberIds
              : [];
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
              chatId: d.id,
              memberIds,
              createdAt,
              updatedAt,
              lastMessage: data.lastMessage || null,
              lastMessageTime: data.lastMessageTime || null,
              type: data.type || "direct",
            } as Chat & { lastMessageTime?: any };
          });

          const sorted = fetchedChats.sort((a, b) => b.updatedAt - a.updatedAt);

          // Fix 1: Fetch the other user's profile using the cache
          const newProfiles = { ...userProfiles };
          let profilesChanged = false;

          const chatsWithUsers = await Promise.all(
            sorted.map(async (chat) => {
              const otherUserId = chat.memberIds.find((id) => id !== uid);
              if (otherUserId) {
                if (newProfiles[otherUserId]) {
                  // Use cached profile
                  return { ...chat, otherUser: newProfiles[otherUserId] };
                } else {
                  // Fetch missing profile
                  try {
                    const snap = await getDoc(doc(db, "users", otherUserId));
                    if (snap.exists()) {
                      const userData = { uid: snap.id, ...snap.data() } as User;
                      newProfiles[otherUserId] = userData;
                      profilesChanged = true;
                      return { ...chat, otherUser: userData };
                    }
                  } catch {
                    /* ignore if user doc missing */
                  }
                }
              }
              return chat;
            })
          );

          if (profilesChanged) {
            setUserProfiles(newProfiles);
          }

          setChats(chatsWithUsers);
          // Fix 6: always set loading false in success path
          setIsLoading(false);
        },
        (err) => {
          console.error("Chat fetch error:", err);
          setError("Could not load chats, please refresh.");
          // Fix 6: always set loading false in error path
          setIsLoading(false);
        }
      );

      // Return inner cleanup (runs when auth state changes again)
      return () => unsubSnap();
    });

    return () => unsubAuth();
  }, [dbUser?.uid, userProfiles]);

  // Listen for 'openChat' event from NotificationsMenu
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      const { type, id } = e.detail;
      if (type === "chat" && id) {
        const chat = chats.find((c) => c.chatId === id);
        if (chat) {
          setActiveChat(chat);
          markChatRead(chat.chatId);
          setReadTick((t) => t + 1);
          window.dispatchEvent(new Event("chatRead"));
        }
      }
    };
    window.addEventListener("openChat", handleOpenChat);
    return () => window.removeEventListener("openChat", handleOpenChat);
  }, [chats, setActiveChat, setReadTick]);

  // Force re-render on chatRead event to update unread dots
  useEffect(() => {
    const handleChatRead = () => setReadTick((t) => t + 1);
    window.addEventListener("chatRead", handleChatRead);
    return () => window.removeEventListener("chatRead", handleChatRead);
  }, []);

  const filteredChats = chats.filter((c) => {
    // Only show direct chats in this sidebar
    if (c.type === "group" || c.type === "warehouse") return false;

    const name = c.otherUser?.fullName || c.otherUser?.name || "Unknown User";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col w-full h-full bg-[#111B21] border-r border-[#2A3942] relative">
      <style jsx global>{`
        /* Custom thin scrollbar for WhatsApp style */
        .chat-sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .chat-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: #2A3942;
          border-radius: 10px;
        }
      `}</style>

      {/* Header / Search bar */}
      <div className="p-3 border-b border-[#2A3942] flex items-center justify-between gap-3 bg-[#111B21]">
        <div className="flex-1 flex items-center bg-[#202C33] px-3 py-1.5 rounded-lg h-[35px]">
          <Search className="w-4 h-4 text-[#8696A0] shrink-0" />
          <input
            type="text"
            placeholder="Search chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none ml-4 text-sm text-[#D1D7DB] placeholder-[#8696A0]"
          />
        </div>
      </div>

      {/* Floating New Chat Button */}
      <button
        onClick={() => setActiveModal("newChat")}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#00A884] hover:bg-[#06CF9C] rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 z-10"
        title="New Chat"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto w-full chat-sidebar-scroll">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8696A0]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading chats…</span>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-400">Could not load chats.</p>
            <p className="text-xs text-[#8696A0]">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center text-[#8696A0] mt-10">
            <Plus className="w-12 h-12 opacity-20 mb-2" />
            <p className="text-sm">
              {searchQuery ? "No matching chats found." : "No chats yet."}
            </p>
          </div>
        )}

        {/* Chat list */}
        {!isLoading &&
          !error &&
          filteredChats.map((chat) => {
            const name = chat.otherUser?.fullName || chat.otherUser?.name || "Unknown User";
            const initial = name[0]?.toUpperCase() || "?";
            const lastMsgTime = (chat as any).lastMessageTime || chat.updatedAt;
            // Handle lastMessage as either string or object for back-compat
            const subtitleText = typeof chat.lastMessage === "string"
              ? chat.lastMessage
              : (chat.lastMessage as any)?.text
                ? (chat.lastMessage as any).text
                : (chat.otherUser?.role ? chat.otherUser.role.replace("_", " ") : "Say hello! 👋");

            const isActive = activeChat?.chatId === chat.chatId;

            const unread = isUnread(chat as any);

            return (
              <div
                key={chat.chatId}
                onClick={() => {
                  setActiveChat(chat);
                  markChatRead(chat.chatId);
                  setReadTick((t) => t + 1);
                  window.dispatchEvent(new Event("chatRead"));
                }}
                className={`flex items-center w-full px-3 py-2 cursor-pointer transition-colors border-l-4 ${isActive
                  ? "bg-[#2A3942] border-[#00A884]"
                  : "bg-transparent border-transparent hover:bg-[#202C33]"
                  }`}
              >
                {/* Avatar (64px) */}
                <div className="w-14 h-14 flex-shrink-0 bg-[#00A884] rounded-full flex items-center justify-center mr-3 text-white font-bold text-xl overflow-hidden">
                  {chat.otherUser?.photoURL ? (
                    <img src={chat.otherUser.photoURL} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-center border-b border-[#2A3942] pb-3 pt-2 h-full overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[17px] font-normal text-[#E9EDEF] truncate">
                      {name}
                    </span>
                    <span className={`text-xs whitespace-nowrap ml-2 shrink-0 ${isActive ? 'text-[#00A884]' : 'text-[#8696A0]'}`}>
                      {(() => {
                        try {
                          if (!lastMsgTime) return ""
                          const date = (lastMsgTime as any)?.toDate
                            ? (lastMsgTime as any).toDate()
                            : new Date(lastMsgTime)
                          if (isNaN(date.getTime())) return ""
                          return formatDistanceToNow(date, { addSuffix: true })
                        } catch {
                          return ""
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pr-2">
                    <div className={`text-sm truncate max-w-[85%] ${unread ? 'text-[#E9EDEF] font-medium' : 'text-[#8696A0]'}`}>
                      {subtitleText}
                    </div>
                    {unread && (
                      <div className="ml-2 shrink-0 min-w-[18px] h-[18px] bg-[#00A884] rounded-full flex items-center justify-center text-[#111B21] text-[10px] font-bold px-1">
                        1
                      </div>
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
