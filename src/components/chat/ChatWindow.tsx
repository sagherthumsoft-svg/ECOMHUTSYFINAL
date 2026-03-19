"use client";

import { useChatStore } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { db, storage, auth } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { markChatRead } from "@/components/layout/AppBar";
import { onAuthStateChanged } from "firebase/auth";
import {
  ref,
  uploadBytesResumable,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { useEffect, useState, useRef } from "react";
import { Message, User } from "@/types";
import {
  Paperclip,
  Image as ImageIcon,
  Smile,
  Mic,
  Send,
  MoreVertical,
  Search,
  ArrowLeft,
  File as FileIcon,
  Download,
  Square,
  Loader2,
  CheckCheck,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { format, isToday, isYesterday } from "date-fns";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useClickAway } from "react-use";
import MessageBubble from "./MessageBubble";
import MediaModal from "../modals/MediaModal";
import RightPanel from "./RightPanel";

export default function ChatWindow() {
  const { activeChat, setActiveChat, messagesCache, setMessagesCache } = useChatStore();
  const { dbUser } = useUserStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // States for Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isHolding = useRef(false);
  const downTime = useRef(0);

  // States for Emoji & UI & RightPanel
  const [showEmoji, setShowEmoji] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | undefined>();
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"info" | "media" | "search" | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useClickAway(emojiRef, () => setShowEmoji(false));
  useClickAway(optionsRef, () => setOptionsOpen(false));
  useClickAway(attachmentRef, () => setAttachmentOpen(false));

  const isFirstLoad = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isFirstLoad.current && messages.length > 0) {
      scrollToBottom("auto");
      isFirstLoad.current = false;
    } else {
      scrollToBottom("smooth");
    }
  }, [messages]);

  useEffect(() => {
    isFirstLoad.current = true;

    const chatId = activeChat?.chatId;
    const uid = dbUser?.uid;

    if (!chatId || !uid) {
      setIsLoading(false);
      setMessages([]);
      setOtherUser(null);
      return;
    }

    const isAdmin = ["owner", "manager", "head"].includes(dbUser.role || "");

    // 1. Initial Load from Cache (Text only for instant open)
    const cached = messagesCache[chatId];
    if (cached) {
      setMessages(cached);
      setIsLoading(false);
    } else {
      setMessages([]);
      setIsLoading(true);
    }

    // 2. Fetch Other User Profile (Async)
    const fetchOtherUser = async () => {
      const otherUserId = activeChat.memberIds.find((id: string) => id !== uid);
      if (otherUserId) {
        try {
          const snap = await getDoc(doc(db, "users", otherUserId));
          if (snap.exists()) {
            const userData = snap.data();
            setOtherUser({
              ...userData,
              uid: snap.id,
              name: userData.name || userData.fullName || userData.email || "User",
            } as User);
          }
        } catch (e) {
          console.error("Error fetching other user:", e);
        }
      }
    };
    fetchOtherUser();

    // 3. Admin Silent Enrollment
    if (!activeChat.memberIds.includes(uid) && isAdmin) {
      const enroll = async () => {
        try {
          const { arrayUnion } = await import("firebase/firestore");
          await updateDoc(doc(db, "chats", chatId), {
            memberIds: arrayUnion(uid),
          });
        } catch (e) {
          console.error("Enrollment failed:", e);
        }
      };
      enroll();
      setAccessDenied(false);
    } else if (!activeChat.memberIds.includes(uid)) {
      setAccessDenied(true);
      setIsLoading(false);
      return;
    } else {
      setAccessDenied(false);
    }

    // 4. Real-time Message Sync
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubSnap = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAt =
            typeof data.createdAt === "number"
              ? data.createdAt
              : data.createdAt?.toMillis?.() || Date.now();

          return {
            id: d.id,
            messageId: d.id,
            ...data,
            createdAt,
          } as Message;
        });

        setMessages(msgs);
        setMessagesCache(chatId, msgs);
        setIsLoading(false);

        // Mark as read when new messages arrive while chat is open
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.senderId !== uid) {
            markChatRead(chatId);
            window.dispatchEvent(new Event("chatRead"));
          }
        }
      },
      (error) => {
        console.error("Messages Error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubSnap();
  }, [activeChat?.chatId, dbUser?.uid]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingMessages, setPendingMessages] = useState<(Message & { pending: boolean; progress: number })[]>([]);

  const handleSend = async () => {
    const messageText = text.trim();
    if (!messageText) return;

    const chatId = activeChat?.chatId;
    const uid = dbUser?.uid || auth.currentUser?.uid;
    const uname = dbUser?.name || dbUser?.fullName || dbUser?.email || auth.currentUser?.displayName || auth.currentUser?.email || "User";

    if (!chatId || !uid) {
      console.error("chatId or uid missing:", chatId, uid);
      toast.error("Unable to send message: Chat or User identity not found.");
      return;
    }

    setText("");
    setShowEmoji(false);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: messageText,
        senderId: uid,
        senderName: uname,
        type: "text",
        createdAt: serverTimestamp(),
        readBy: [uid],
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageAt: Date.now(),
        lastMessageSenderId: uid,
        updatedAt: serverTimestamp(),
      });

      // Write to clientNotifications for the other user
      const otherUserId = activeChat.memberIds.find((id: string) => id !== uid);
      if (otherUserId) {
        await addDoc(collection(db, "clientNotifications"), {
          receiverIds: [otherUserId],
          type: "New Message",
          message: `${uname}: ${messageText.substring(0, 50)}${messageText.length > 50 ? "..." : ""}`,
          isRead: false,
          createdAt: Date.now(),
          link: "/dashboard/chats",
          chatId: chatId,
        });
      }

      scrollToBottom();
    } catch (err) {
      console.error("Send failed:", err);
      setText(messageText);
    }
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const chatId = activeChat?.chatId;
    const uid = dbUser?.uid || auth.currentUser?.uid;
    const uname = dbUser?.name || dbUser?.fullName || dbUser?.email || auth.currentUser?.displayName || auth.currentUser?.email || "User";
    if (!chatId || !uid) {
      toast.error("Unable to upload: Chat or User identity not found.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const msgType = isImage ? "image" : isVideo ? "video" : "file";

    // Optimistic Upload: Create a pending message
    const pendingId = Math.random().toString(36).substring(7);
    const localPreviewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : "";

    const pendingMsg = {
      id: pendingId,
      messageId: pendingId,
      senderId: uid,
      senderName: uname,
      type: msgType as any,
      fileUrl: localPreviewUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      createdAt: Date.now(),
      pending: true,
      progress: 0,
    };

    setPendingMessages(prev => [...prev, pendingMsg]);
    setAttachmentOpen(false);

    const storageRef = ref(
      storage,
      `chats/${chatId}/${Date.now()}_${file.name}`
    );

    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setPendingMessages(prev =>
          prev.map(m => m.id === pendingId ? { ...m, progress } : m)
        );
      },
      (err) => {
        console.error("Upload error:", err);
        setPendingMessages(prev => prev.filter(m => m.id !== pendingId));
        toast.error("Upload failed.");
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);

        try {
          await addDoc(collection(db, "chats", chatId, "messages"), {
            type: msgType,
            fileUrl: url,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            senderId: uid,
            senderName: uname,
            createdAt: serverTimestamp(),
            readBy: [uid],
          });

          await updateDoc(doc(db, "chats", chatId), {
            lastMessage: isImage
              ? "📷 Photo"
              : isVideo
                ? "🎥 Video"
                : `📎 ${file.name}`,
            lastMessageTime: serverTimestamp(),
            lastMessageAt: Date.now(),
            lastMessageSenderId: uid,
            updatedAt: serverTimestamp(),
          });

          // Write to clientNotifications for the other user
          const otherUserId = activeChat.memberIds.find((id: string) => id !== uid);
          if (otherUserId) {
            await addDoc(collection(db, "clientNotifications"), {
              receiverIds: [otherUserId],
              type: "New Media",
              message: `${uname} sent an attachment.`,
              isRead: false,
              createdAt: Date.now(),
              link: "/dashboard/chats",
              chatId: chatId,
            });
          }
        } catch (e) {
          console.error("Failed to save message:", e);
        } finally {
          setPendingMessages(prev => prev.filter(m => m.id !== pendingId));
          if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        }
      }
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadVoiceNote(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((p) => p + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isRecording) {
      startRecording();
    }
    isHolding.current = true;
    downTime.current = Date.now();
  };

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (isHolding.current) {
      const duration = Date.now() - downTime.current;
      if (duration > 300) {
        // Hold detected, stop recording
        stopRecording();
      }
      isHolding.current = false;
    }
  };

  const handleMicClick = () => {
    if (isRecording && !isHolding.current) {
      // Toggle stop if it was a click
      stopRecording();
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const uploadVoiceNote = async (blob: Blob) => {
    const chatId = activeChat?.chatId;
    const uid = dbUser?.uid || auth.currentUser?.uid;
    const uname = dbUser?.name || dbUser?.fullName || dbUser?.email || auth.currentUser?.displayName || auth.currentUser?.email || "User";
    if (!chatId || !uid) {
      toast.error("Unable to upload voice note: Chat or User identity not found.");
      return;
    }

    setUploading(true);
    const storageRef = ref(
      storage,
      `chats/${chatId}/voice/${Date.now()}.webm`
    );

    try {
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "chats", chatId, "messages"), {
        type: "voice",
        voiceUrl: url,
        duration: recordingDuration,
        senderId: uid,
        senderName: uname,
        createdAt: serverTimestamp(),
        readBy: [uid],
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: "🎤 Voice message",
        lastMessageTime: serverTimestamp(),
        lastMessageAt: Date.now(),
        lastMessageSenderId: uid,
        updatedAt: serverTimestamp(),
      });

      // Write to clientNotifications for the other user
      const otherUserId = activeChat.memberIds.find((id: string) => id !== uid);
      if (otherUserId) {
        await addDoc(collection(db, "clientNotifications"), {
          receiverIds: [otherUserId],
          type: "New Voice Note",
          message: `${uname} sent a voice note.`,
          isRead: false,
          createdAt: Date.now(),
          link: "/dashboard/chats",
          chatId: chatId,
        });
      }

      setUploading(false);
      scrollToBottom();
    } catch (err) {
      console.error("Voice upload error:", err);
      setUploading(false);
    }
  };

  // Helper to extract storage path from a Firebase Storage download URL
  const getStoragePathFromUrl = (url: string): string | null => {
    try {
      const match = url.match(/\/o\/(.+?)\?alt=media/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch {
      return null;
    }
  };

  // Delete a single message and its attached file/voice from Storage
  const handleDeleteMessage = async (msgToDelete: Message) => {
    const chatId = activeChat?.chatId;
    if (!chatId || !msgToDelete) return;

    if (!confirm("Delete message?")) return;

    try {
      const msgDocId = msgToDelete.messageId || (msgToDelete as any).id;
      if (!msgDocId) throw new Error("No message ID");

      // Delete associated file from storage if it exists
      const fileUrl = msgToDelete.fileUrl || (msgToDelete as any).voiceUrl;
      if (fileUrl) {
        const path = getStoragePathFromUrl(fileUrl);
        if (path) {
          const fileRef = ref(storage, path);
          await deleteObject(fileRef).catch((err) => {
            console.warn("File already deleted or not found:", err);
          });
        }
      }

      await deleteDoc(doc(db, "chats", chatId, "messages", msgDocId));

      // Update lastMessage preview if deleted message was the last one
      if (messages.length > 0 && messages[messages.length - 1].messageId === msgDocId) {
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: "🚫 This message was deleted"
        });
      }

      toast.success("Message deleted");
    } catch (e: any) {
      console.error("Delete failed:", e);
      toast.error("Failed to delete message");
    }
  };

  // Clear entire chat – delete all messages and their attached files
  const handleClearChat = async () => {
    if (!confirm("Clear all messages? This cannot be undone.")) return;
    setOptionsOpen(false);
    const chatId = activeChat?.chatId;
    if (!chatId) return;

    try {
      for (const msg of messages) {
        const fileUrl = msg.fileUrl || (msg as any).voiceUrl;
        if (fileUrl) {
          const path = getStoragePathFromUrl(fileUrl);
          if (path) {
            const fileRef = ref(storage, path);
            await deleteObject(fileRef).catch(() => { });
          }
        }
      }

      await Promise.all(
        messages.map((msg) =>
          deleteDoc(
            doc(db, "chats", chatId, "messages", msg.messageId || (msg as any).id)
          )
        )
      );
      toast.success("Chat cleared");
    } catch (e: any) {
      toast.error("Failed to clear");
    }
  };

  const truncate = (str: string, n: number) =>
    str.length > n ? str.substring(0, n) + "..." : str;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const renderDateDivider = (timestamp: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    let label = format(date, "dd/MM/yyyy");
    if (isToday(date)) label = "Today";
    else if (isYesterday(date)) label = "Yesterday";

    return (
      <div className="flex justify-center my-4 z-10">
        <div className="bg-[#182229] text-[#8696A0] text-[12px] px-3 py-1 rounded-lg shadow-sm">
          {label}
        </div>
      </div>
    );
  };

  if (!activeChat) return null;

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#0B141A] text-white">
        <p>You don't have access to this chat.</p>
      </div>
    );
  }

  let lastDateLabel = "";

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#0B141A]">
      <div className="flex flex-col flex-1 h-full relative z-10 transition-all">
        <style>{`
          .chat-scroll::-webkit-scrollbar { width: 6px; }
          .chat-scroll::-webkit-scrollbar-track { background: transparent; }
          .chat-scroll::-webkit-scrollbar-thumb { background-color: #2A3942; border-radius: 10px; }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 bg-[#202C33] border-l border-[#2A3942] z-20 shadow-sm shrink-0"
          style={{ height: "60px" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveChat(null)}
              className="md:hidden p-1 text-[#AEBAC1] hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-[40px] h-[40px] rounded-full bg-[#00A884] flex items-center justify-center text-white overflow-hidden shadow-sm font-bold">
              {otherUser?.photoURL ? (
                <img src={otherUser.photoURL} className="w-full h-full object-cover" alt="" />
              ) : (
                otherUser?.name?.[0]?.toUpperCase() || "U"
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-semibold text-white">
                {otherUser?.fullName || otherUser?.name || "Direct Chat"}
              </span>
              <span className="text-xs text-[#8696A0] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A884]"></span> online
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-5 text-[#AEBAC1]">
            <Search onClick={() => setRightPanelMode("search")} className="w-5 h-5 cursor-pointer hover:text-white transition" />
            <div className="relative" ref={optionsRef}>
              <button onClick={() => setOptionsOpen(!optionsOpen)}>
                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition" />
              </button>
              {optionsOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-[#233138] rounded shadow-xl border border-[#2A3942] z-50 py-2">
                  <button onClick={() => { setRightPanelMode("search"); setOptionsOpen(false); }} className="w-full text-left px-5 py-3 hover:bg-[#111B21] text-sm text-[#E9EDEF] transition-colors">
                    Search
                  </button>
                  <button onClick={() => { setRightPanelMode("media"); setOptionsOpen(false); }} className="w-full text-left px-5 py-3 hover:bg-[#111B21] text-sm text-[#E9EDEF] transition-colors">
                    Media, Links, Docs
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="w-full text-left px-5 py-3 hover:bg-[#111B21] text-sm text-[#E9EDEF] transition-colors"
                  >
                    Clear chat
                  </button>
                  <button onClick={() => { setRightPanelMode("info"); setOptionsOpen(false); }} className="w-full text-left px-5 py-3 hover:bg-[#111B21] text-sm text-[#E9EDEF] transition-colors">
                    Chat Info
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 lg:px-[8%] py-5 flex flex-col space-y-2 chat-scroll relative bg-[#0B141A]">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
                "url('https://static.whatsapp.net/rsrc.php/v3/yS/r/HwD5_61P37w.png')",
              backgroundSize: "412px",
            }}
          />

          {isLoading && (
            <div className="flex justify-center my-6 z-10">
              <div className="bg-[#202C33] text-[#AEBAC1] px-4 py-2 rounded-full text-sm shadow-sm flex items-center gap-2 border border-[#2A3942]">
                <Loader2 className="w-4 h-4 animate-spin text-[#00A884]" /> Loading...
              </div>
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center z-10 mt-10">
              <div className="bg-[#202C33]/80 backdrop-blur text-[#8696A0] px-6 py-4 rounded-xl text-sm shadow-sm text-center max-w-sm border border-[#2A3942]">
                <p className="mb-2 text-[#E9EDEF]">No messages yet. Say hello! 👋</p>
                <p className="text-xs">Messages are end-to-end encrypted.</p>
              </div>
            </div>
          )}

          {!isLoading &&
            [...messages, ...pendingMessages].map((msg, idx, allMsgs) => {
              const isMine = msg.senderId === dbUser?.uid;
              const msgDate = new Date(msg.createdAt || Date.now());
              const dateStr = format(msgDate, "yyyy-MM-dd");
              let showDateDivider = false;

              if (dateStr !== lastDateLabel) {
                showDateDivider = true;
                lastDateLabel = dateStr;
              }

              // Stacking logic: check if previous message was from same sender
              const prevMsg = idx > 0 ? allMsgs[idx - 1] : null;
              const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId || showDateDivider;

              return (
                <div key={msg.messageId || msg.id || idx} className="contents">
                  {showDateDivider && renderDateDivider(msg.createdAt)}
                  <MessageBubble
                    message={msg as any}
                    isMine={isMine}
                    isFirstInGroup={isFirstInGroup}
                    onDelete={handleDeleteMessage}
                    onMediaClick={(m: Message) => {
                      setSelectedMediaId(m.messageId || m.id);
                      setIsMediaModalOpen(true);
                    }}
                    isGroupChat={false}
                  />
                </div>
              );
            })}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <MediaModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          messages={messages}
          initialMessageId={selectedMediaId}
        />

        {/* Input Area */}
        <div className="bg-[#202C33] px-4 py-2 flex items-end gap-3 z-20">
          {showEmoji && (
            <div ref={emojiRef} className="absolute bottom-[70px] left-4 z-50">
              <EmojiPicker
                onEmojiClick={(e) => setText((t) => t + e.emoji)}
                theme={Theme.DARK}
                lazyLoadEmojis={true}
              />
            </div>
          )}

          {attachmentOpen && (
            <div
              ref={attachmentRef}
              className="absolute bottom-[70px] left-[60px] z-50 bg-[#233138] rounded-2xl shadow-xl border border-[#2A3942] py-2 flex flex-col w-48"
            >
              <div
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#111B21] cursor-pointer transition"
              >
                <div className="bg-[#BF59CF] w-10 h-10 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[#E9EDEF] text-[15px]">Photos & Videos</span>
              </div>
              <div
                onClick={() => docInputRef.current?.click()}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#111B21] cursor-pointer transition"
              >
                <div className="bg-[#7F66FF] w-10 h-10 rounded-full flex items-center justify-center">
                  <FileIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[#E9EDEF] text-[15px]">Document</span>
              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            ref={imageInputRef}
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
            style={{ display: "none" }}
            ref={docInputRef}
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
          />

          <div className="flex items-center space-x-2 text-[#8696A0] pb-2 text-[26px]">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-1 hover:text-[#D1D7DB] transition"
            >
              <Smile className="w-7 h-7" />
            </button>
            <button
              onClick={() => setAttachmentOpen(!attachmentOpen)}
              className="p-1 hover:text-[#D1D7DB] transition"
            >
              <Paperclip className="w-6 h-6" />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-1 cursor-pointer hover:text-[#D1D7DB] transition"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 bg-[#2A3942] rounded-[24px] flex flex-col px-4 py-[6px] my-1 relative">
            {isRecording && (
              <div className="text-[#FF5E5E] text-[13px] font-medium animate-pulse mb-0.5 ml-1">
                🔴 Recording... {formatDuration(recordingDuration)} (release or click to send)
              </div>
            )}
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={isRecording ? "" : "Type a message"}
              value={text}
              onChange={adjustTextareaHeight}
              onKeyDown={handleKeyDown}
              disabled={isRecording}
              className="w-full bg-transparent border-none outline-none text-[#D1D7DB] text-[15px] resize-none max-h-[120px] placeholder-[#8696A0] leading-[22px]"
            />
          </div>

          <div className="flex text-[#8696A0] pb-[6px] pl-1">
            {text.trim() ? (
              <button
                onClick={handleSend}
                className="w-10 h-10 rounded-full bg-[#00A884] hover:bg-[#06CF9C] flex items-center justify-center text-white shadow transition-all scale-in"
              >
                <Send className="w-[18px] h-[18px] ml-0.5" />
              </button>
            ) : (
              <button
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onClick={handleMicClick}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow transition-all duration-200 ${
                  isRecording
                    ? "bg-[#FF5E5E] scale-110 shadow-lg shadow-red-500/20"
                    : "bg-[#00A884] hover:bg-[#06CF9C]"
                }`}
                title={isRecording ? "Click to stop" : "Hold to record / Click to start"}
              >
                {isRecording ? (
                  <Square className="w-5 h-5 fill-current" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}
          </div>

          {isRecording && (
            <div className="absolute left-1/2 bottom-[80px] -translate-x-1/2 bg-[#233138] px-5 py-2.5 rounded-full border border-red-500/50 flex items-center gap-3 animate-in fade-in shadow-xl z-50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[#E9EDEF] font-mono text-[15px]">
                {formatDuration(recordingDuration)}
              </span>
              <span className="text-[#8696A0] text-xs font-medium ml-2 border-l border-[#2A3942] pl-3">
                Tap or release to send
              </span>
            </div>
          )}
        </div>
      </div>
      {rightPanelMode && (
        <RightPanel
          mode={rightPanelMode}
          onClose={() => setRightPanelMode(null)}
          messages={messages}
          chatData={{
            name: otherUser?.fullName || otherUser?.name || "Direct Chat",
            image: otherUser?.photoURL || undefined,
            description: "Direct end-to-end encrypted chat."
          }}
        />
      )}
    </div>
  );
}