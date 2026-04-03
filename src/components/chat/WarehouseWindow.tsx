"use client";

import { useWarehouseStore } from "@/store/warehouseStore";
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
  deleteDoc,
} from "firebase/firestore";
import { markChatRead } from "@/components/layout/AppBar";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useEffect, useState, useRef } from "react";
import { Message } from "@/types";
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
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import { format, isToday, isYesterday } from "date-fns";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useClickAway } from "react-use";
import MessageBubble from "./MessageBubble";
import MediaModal from "../modals/MediaModal";
import RightPanel from "./RightPanel";

export default function WarehouseWindow() {
  const { activeWarehouse, setActiveWarehouse, messagesCache, setMessagesCache } = useWarehouseStore();
  const { dbUser } = useUserStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [selectedMediaId, setSelectedMediaId] = useState<string | undefined>();
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // States for Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isHolding = useRef(false);
  const downTime = useRef(0);

  // States for Emoji & UI
  const [showEmoji, setShowEmoji] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"info" | "media" | "search" | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingMessages, setPendingMessages] = useState<(Message & { pending: boolean; progress: number })[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

    const warehouseId = activeWarehouse?.warehouseId;
    const uid = dbUser?.uid;

    if (!warehouseId || !uid) {
      setIsLoading(false);
      setMessages([]);
      return;
    }

    const isAdmin = ["owner", "manager", "head"].includes(dbUser.role || "");

    // 1. Initial Load from Cache
    const cached = messagesCache[warehouseId];
    if (cached) {
      setMessages(cached);
      setIsLoading(false);
    } else {
      setMessages([]);
      setIsLoading(true);
    }

    // 2. Enrollment check
    if (!activeWarehouse.memberIds.includes(uid)) {
      if (isAdmin) {
        const enroll = async () => {
          try {
            const { arrayUnion } = await import("firebase/firestore");
            await updateDoc(doc(db, "chats", warehouseId), {
              memberIds: arrayUnion(uid)
            });
          } catch (e) {
            console.error("Enrollment failed:", e);
          }
        };
        enroll();
        setAccessDenied(false);
      } else {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }
    } else {
      setAccessDenied(false);
    }

    // 3. Real-time Message Sync
    const q = query(
      collection(db, "chats", warehouseId, "messages"),
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
        setMessagesCache(warehouseId, msgs);
        setIsLoading(false);

        // Mark as read when new messages arrive while chat is open
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.senderId !== uid) {
            markChatRead(warehouseId);
            window.dispatchEvent(new Event("chatRead"));
          }
        }
      },
      (error) => {
        console.error("Warehouse Messages Error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubSnap();
  }, [activeWarehouse?.warehouseId, dbUser?.uid]);

  const handleSend = async () => {
    const warehouseId = activeWarehouse?.warehouseId;
    const uid = dbUser?.uid;
    if (!text.trim() || !warehouseId || !uid) return;

    const messageText = text.trim();
    setText("");
    setShowEmoji(false);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const newMsg = {
        text: messageText,
        senderId: uid,
        senderName: dbUser?.name || dbUser?.fullName || "User",
        type: "text",
        messageType: "text", // Keep for backwards compatibility
        createdAt: serverTimestamp(),
        readBy: [uid],
      };

      await addDoc(
        collection(db, "chats", warehouseId, "messages"),
        newMsg
      );

      // Update parent warehouse doc
      await updateDoc(doc(db, "chats", warehouseId), {
        lastMessage: `${dbUser?.name || dbUser?.fullName || "User"}: ${messageText.substring(0, 60)}`,
        lastMessageAt: Date.now(),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: uid,
        updatedAt: serverTimestamp(),
      });

      // Write to clientNotifications for other members
      const parts = (activeWarehouse?.memberIds || []).filter((p: string) => p !== uid);
      await Promise.all(
        parts.map(async (partUid: string) => {
          await addDoc(collection(db, "clientNotifications"), {
            receiverIds: [partUid],
            type: "Warehouse Update",
            message: `${activeWarehouse?.name} - ${dbUser?.name || "User"}: ${messageText.substring(0, 50)}${messageText.length > 50 ? "..." : ""}`,
            isRead: false,
            createdAt: Date.now(),
            link: "/dashboard/warehouses",
            warehouseId: warehouseId,
          });
        })
      );
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to send message");
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement> | null,
    type: "image" | "file" | "voice" | "pdf",
    directFile?: File | Blob
  ) => {
    let file = directFile;
    if (e?.target?.files && e.target.files[0]) {
      file = e.target.files[0];
    }

    if (!file || !activeWarehouse || !dbUser?.uid) return;
    setAttachmentOpen(false);

    const warehouseId = activeWarehouse.warehouseId;
    const uid = dbUser.uid;
    const toastId = toast.loading(`Uploading ${type}...`);

    try {
      const actualFile =
        file instanceof File
          ? file
          : new File([file], `voice_${Date.now()}.webm`, {
            type: "audio/webm",
          });

      const path = `storage/chats/${warehouseId}/files/${Date.now()}_${actualFile.name}`;
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, actualFile);

      // Optimistic UI: Create a pending message
      const pendingId = Math.random().toString(36).substring(7);
      const isImage = actualFile.type.startsWith("image/");
      const isVideo = actualFile.type.startsWith("video/");
      const localPreviewUrl = (isImage || isVideo) ? URL.createObjectURL(actualFile) : "";

      const pendingMsg = {
        id: pendingId,
        messageId: pendingId,
        senderId: uid,
        senderName: dbUser.name || dbUser.fullName || "User",
        type: type as any,
        fileUrl: localPreviewUrl,
        fileName: actualFile.name,
        fileSize: actualFile.size,
        fileType: actualFile.type,
        createdAt: Date.now(),
        pending: true,
        progress: 0,
      };

      setPendingMessages(prev => [...prev, pendingMsg]);
      setUploading(true);

      uploadTask.on(
        "state_changed",
        (snap) => {
          const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setPendingMessages(prev =>
            prev.map(m => m.id === pendingId ? { ...m, progress } : m)
          );
        },
        (error) => {
          console.error("Upload error:", error);
          setPendingMessages(prev => prev.filter(m => m.id !== pendingId));
          setUploading(false);
          toast.error("Upload failed");
          toast.dismiss(toastId);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);

            const newMsg: any = {
              senderId: uid,
              senderName: dbUser.name || dbUser.fullName || "User",
              type: type,
              messageType: type,
              fileUrl: url,
              fileName: actualFile.name,
              fileSize: actualFile.size,
              fileType: actualFile.type,
              createdAt: serverTimestamp(),
              readBy: [uid],
            };

            if (type === "voice") {
              newMsg.duration = recordingDuration || 1;
              setRecordingDuration(0);
            }

            await addDoc(collection(db, "chats", warehouseId, "messages"), newMsg);

            await updateDoc(doc(db, "chats", warehouseId), {
              lastMessage: `${dbUser?.name || "User"}: ${type === "voice" ? "🎤 Voice Note" : `📁 ${actualFile.name}`}`,
              lastMessageAt: Date.now(),
              lastMessageTime: serverTimestamp(),
              lastMessageSenderId: uid,
              updatedAt: serverTimestamp(),
            });

            // Write to clientNotifications for other members
            const parts = activeWarehouse.memberIds.filter((p: string) => p !== uid);
            await Promise.all(
              parts.map(async (partUid: string) => {
                await addDoc(collection(db, "clientNotifications"), {
                  receiverIds: [partUid],
                  type: "Warehouse Update",
                  message: `${activeWarehouse.name} - ${dbUser?.name || "User"} sent an attachment.`,
                  isRead: false,
                  createdAt: Date.now(),
                  link: "/dashboard/warehouses",
                  warehouseId: warehouseId,
                });
              })
            );

            toast.success("Sent!");
          } catch (e) {
            console.error("Failed to save message:", e);
            toast.error("Failed to save message.");
          } finally {
            setPendingMessages(prev => prev.filter(m => m.id !== pendingId));
            setUploading(false);
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
            toast.dismiss(toastId);
          }
        }
      );
    } catch (error) {
      console.error(error);
      setUploading(false);
      toast.error("An error occurred during upload.");
      toast.dismiss(toastId);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await handleFileUpload(null, "voice", audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000) as any;
    } catch (e: any) {
      toast.error("Microphone access denied");
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleDeleteMessage = async (msgToDelete: Message) => {
    const warehouseId = activeWarehouse?.warehouseId;
    if (!warehouseId || !msgToDelete) return;

    if (!confirm("Delete message?")) return;

    try {
      const msgDocId = msgToDelete.messageId || (msgToDelete as any).id;
      if (!msgDocId) throw new Error("No message ID");

      await deleteDoc(doc(db, "chats", warehouseId, "messages", msgDocId));

      if (messages.length > 0 && messages[messages.length - 1].messageId === msgDocId) {
        await updateDoc(doc(db, "chats", warehouseId), {
          lastMessage: "🚫 This message was deleted"
        });
      }

      toast.success("Message deleted");
    } catch (e: any) {
      console.error("Delete failed:", e);
      toast.error("Failed to delete message");
    }
  };

  const handleClearChat = async () => {
    const warehouseId = activeWarehouse?.warehouseId;
    if (!warehouseId) return;
    if (!confirm("Clear all messages? This cannot be undone.")) return;
    setOptionsOpen(false);
    try {
      await Promise.all(
        messages.map((msg) =>
          deleteDoc(doc(db, "chats", warehouseId, "messages", msg.messageId || (msg as any).id))
        )
      );
      toast.success("Chat cleared");
    } catch (e: any) {
      toast.error("Failed to clear");
    }
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

  if (!activeWarehouse) return null;

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
        <div className="flex items-center justify-between px-4 bg-[#202C33] border-l border-[#2A3942] z-20 shadow-sm shrink-0" style={{ height: '60px' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveWarehouse(null)}
              className="md:hidden p-1 text-[#AEBAC1] hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-[40px] h-[40px] rounded-full bg-[#00A884] flex items-center justify-center text-white overflow-hidden shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-semibold text-white">
                {activeWarehouse.name || "Loading..."}
              </span>
              <span className="text-xs text-[#8696A0]">
                {activeWarehouse.memberIds.length} staff
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
                    Warehouse Info
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-5 lg:px-[8%] py-5 flex flex-col space-y-2 chat-scroll relative bg-[#0B141A]">
        {/* WhatsApp Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yS/r/HwD5_61P37w.png')", backgroundSize: "412px" }}
        />

        {isLoading && (
          <div className="flex justify-center my-6 z-10">
            <div className="bg-[#202C33] text-[#AEBAC1] px-4 py-2 rounded-full text-sm shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center z-10 mt-10">
            <div className="bg-[#202C33]/80 backdrop-blur text-[#8696A0] px-6 py-4 rounded-xl text-sm shadow-sm text-center max-w-sm border border-[#2A3942]">
              <p className="mb-2 text-[#E9EDEF]">No messages yet. Say hello! 👋</p>
              <p className="text-xs">Messages are end-to-end encrypted.</p>
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {!isLoading &&
          [...messages, ...pendingMessages].map((msg, idx, allMsgs) => {
            const isMine = msg.senderId === dbUser?.uid;

            // Date Divider logic
            const msgDate = new Date(msg.createdAt || Date.now());
            const dateStr = format(msgDate, "yyyy-MM-dd");
            let showDateDivider = false;
            if (dateStr !== lastDateLabel) {
              showDateDivider = true;
              lastDateLabel = dateStr;
            }

            // Stacking logic
            const prevMsg = idx > 0 ? allMsgs[idx - 1] : null;
            const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId || showDateDivider;

            return (
              <div key={msg.messageId || msg.id || idx} className="contents">
                {showDateDivider && renderDateDivider(msg.createdAt)}
                <MessageBubble
                  message={msg as any}
                  isMine={isMine}
                  isFirstInGroup={isFirstInGroup}
                  onMediaClick={(m: Message) => {
                    setSelectedMediaId(m.messageId || m.id);
                    setIsMediaModalOpen(true);
                  }}
                  onDelete={handleDeleteMessage}
                  isGroupChat={true}
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
            <label className="flex items-center gap-3 px-5 py-3 hover:bg-[#111B21] cursor-pointer transition">
               <div className="bg-[#BF59CF] w-10 h-10 rounded-full flex items-center justify-center">
                 <ImageIcon className="w-5 h-5 text-white" />
               </div>
               <span className="text-[#E9EDEF] text-[15px]">Photos & Videos</span>
               <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
            </label>
            <label className="flex items-center gap-3 px-5 py-3 hover:bg-[#111B21] cursor-pointer transition">
               <div className="bg-[#7F66FF] w-10 h-10 rounded-full flex items-center justify-center">
                 <FileIcon className="w-5 h-5 text-white" />
               </div>
               <span className="text-[#E9EDEF] text-[15px]">Document</span>
               <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx" className="hidden" onChange={(e) => handleFileUpload(e, "file")} />
            </label>
          </div>
        )}

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
          <label className="p-1 cursor-pointer hover:text-[#D1D7DB] transition">
            <ImageIcon className="w-6 h-6" />
            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
          </label>
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
            name: activeWarehouse?.name || "Warehouse",
            membersCount: activeWarehouse?.memberIds?.length || 0,
            createdAt: activeWarehouse?.createdAt
          }}
        />
      )}
    </div>
  );
}
