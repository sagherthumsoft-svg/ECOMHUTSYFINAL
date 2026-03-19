"use client";

import { useUserStore } from "@/store/userStore";
import { Message } from "@/types";
import { format } from "date-fns";
import {
  CheckCheck,
  Download,
  FileIcon,
  MoreHorizontal,
  Play,
  Trash2,
  FileText,
  FileCode,
  FileSpreadsheet,
  FilePlus,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { memo, useState } from "react";
import { formatFileSize, getFileIconColor, getFileExtension, downloadFile } from "@/lib/fileUtils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import VoicePlayer from "./VoicePlayer";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MessageBubbleProps {
  message: Message & { pending?: boolean; progress?: number };
  isMine: boolean;
  isFirstInGroup: boolean;
  onDelete?: (message: Message) => void;
  onMediaClick?: (message: Message) => void;
  isGroupChat?: boolean;
}

const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#34B7F1] hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const MessageBubble = memo(({
  message,
  isMine,
  isFirstInGroup,
  onDelete,
  onMediaClick,
  isGroupChat = false,
}: MessageBubbleProps) => {
  const { dbUser } = useUserStore();
  const [showOptions, setShowOptions] = useState(false);
  const messageType = message.type || message.messageType || "text";
  const createdAt = message.createdAt ? new Date(message.createdAt) : new Date();

  const handleFileClick = () => {
    if (message.pending || !message.fileUrl) return;
    // All files open in MediaModal for preview/download option
    onMediaClick?.(message);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.fileUrl) {
      downloadFile(message.fileUrl, message.fileName || "download");
    }
  };

  // ... (renderFileIcon remains)
  const renderFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    const colorClass = getFileIconColor(fileName);

    return (
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm", colorClass)}>
        {ext === "pdf" ? <FileText className="w-5 h-5 text-white" /> :
          ext === "doc" || ext === "docx" ? <FileText className="w-5 h-5 text-white" /> :
            ext === "xls" || ext === "xlsx" || ext === "csv" ? <FileSpreadsheet className="w-5 h-5 text-white" /> :
              <FileIcon className="w-5 h-5 text-white" />}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-1 group relative",
        isMine ? "justify-end" : "justify-start",
        isFirstInGroup && "mt-3"
      )}
    >
      {/* ... structure same ... */}
      <div
        onMouseEnter={() => setShowOptions(true)}
        onMouseLeave={() => setShowOptions(false)}
        className={cn(
          "relative max-w-[85%] md:max-w-[70%] lg:max-w-[60%] shadow-sm transition-all duration-200",
          isMine
            ? "bg-[#005C4B] text-white rounded-2xl rounded-tr-none"
            : "bg-[#202C33] text-white rounded-2xl rounded-tl-none",
          !isFirstInGroup && (isMine ? "rounded-tr-2xl" : "rounded-tl-2xl"),
          message.pending && "opacity-70"
        )}
      >
        {/* Tail for first message in group */}
        {isFirstInGroup && (
          <div
            className={cn(
              "absolute top-0 w-4 h-4",
              isMine
                ? "-right-2 bg-[#005C4B] [clip-path:polygon(0_0,0_100%,100%_0)]"
                : "-left-2 bg-[#202C33] [clip-path:polygon(100%_0,100%_100%,0_0)]"
            )}
          />
        )}

        {/* Content Container */}
        <div className={cn(
          "flex flex-col relative min-w-[90px]",
          // If message is ONLY an image or video (no text), it has zero inner padding from bubble edges
          (messageType === "image" || messageType === "video") && !message.text ? "p-1" : "p-1.5"
        )}>
          {/* Sender Name for Groups */}
          {isGroupChat && !isMine && message.senderName && (
            <div
              onClick={async (e) => {
                e.stopPropagation();
                if (!dbUser?.uid || !message.senderId) return;
                try {
                  const { ensureDirectChat } = await import("@/lib/chatUtils");
                  const chatId = await ensureDirectChat(dbUser.uid, message.senderId);

                  // Dispatch openChat event
                  const event = new CustomEvent("openChat", {
                    detail: { type: "chat", id: chatId }
                  });
                  window.dispatchEvent(event);

                  // Redirect if NOT on chats page
                  if (window.location.pathname !== "/dashboard/chats") {
                    window.location.href = "/dashboard/chats";
                  }
                } catch (err) {
                  console.error("Failed to start direct chat:", err);
                }
              }}
              className={cn("mb-1 text-[13px] font-semibold text-[#25D366] leading-none pt-1 cursor-pointer hover:underline",
                (messageType === "image" || messageType === "video") && !message.text ? "px-1.5 pt-1.5 z-10 relative drop-shadow-md text-white font-bold" : "px-1.5"
              )}
            >
              {message.senderName}
            </div>
          )}

          {/* Media Content */}
          {messageType === "image" && (
            <div
              className={`relative overflow-hidden rounded-[10px] cursor-pointer group/media bg-[#202C33]/50 min-h-[150px] flex items-center justify-center`}
              onClick={() => !message.pending && onMediaClick?.(message)}
            >
              <img
                src={message.fileUrl || "/placeholder.png"}
                alt="Shared media"
                className="max-h-[350px] w-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                loading="lazy"
                onLoad={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).classList.remove('bg-[#202C33]/50');
                }}
              />
              {/* Media Timestamp Overlay (Dark gradient) */}
              {(!message.text) && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              )}
              {message.pending && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="relative w-12 h-12">
                    <Loader2 className="w-12 h-12 text-[#00A884] animate-spin absolute inset-0" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                      {message.progress || 0}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {messageType === "video" && (
            <div
              className={`relative overflow-hidden rounded-[10px] cursor-pointer group/media bg-black/40 min-h-[150px] flex items-center justify-center`}
              onClick={() => !message.pending && onMediaClick?.(message)}
            >
              <video
                src={message.fileUrl}
                className="max-h-[400px] w-full object-cover"
                onLoadedData={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).classList.remove('bg-black/40');
                }}
              />
              {/* Media Timestamp Overlay (Dark gradient) */}
              {(!message.text) && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              )}
              <div className="absolute inset-0 flex items-center justify-center group-hover/media:bg-black/10 transition-colors">
                <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 transition-all group-hover/media:scale-110 group-hover/media:bg-[#00A884]/80 group-hover/media:border-[#00A884]">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </div>
              </div>
              {message.pending && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <Loader2 className="w-10 h-10 text-[#00A884] animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Document Content */}
          {(messageType === "file" || messageType === "pdf") && (
            <div
              onClick={handleFileClick}
              className="flex items-center gap-3 p-2 pr-4 bg-black/10 hover:bg-black/20 rounded-xl transition-colors cursor-pointer mb-1"
            >
              {renderFileIcon(message.fileName || "file")}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate">
                  {message.fileName || "Document"}
                </span>
                <span className="text-[10px] opacity-70 uppercase">
                  {message.fileSize ? formatFileSize(message.fileSize) : "Unknown size"} • {getFileExtension(message.fileName || "")}
                </span>
              </div>
              {message.pending ? (
                <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <button
                  onClick={handleDownloadClick}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Voice Content */}
          {messageType === "voice" && (
            (message as any).voiceUrl || message.fileUrl ? (
              <VoicePlayer
                url={(message as any).voiceUrl || message.fileUrl!}
                duration={message.duration || 0}
                isMine={isMine}
                senderPhoto={(message as any).senderPhoto || null}
              />
            ) : (
              <div className="flex items-center gap-3 py-1 px-2 min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center shrink-0">
                  <Play className="w-5 h-5 text-white fill-current" />
                </div>
                <div className="flex-1 h-8 flex items-center gap-0.5 opacity-50">
                  <div className="text-xs">Processing...</div>
                </div>
                {message.pending && <Loader2 className="w-4 h-4 text-white animate-spin ml-2" />}
              </div>
            )
          )}

          {/* Text Content */}
          {message.text && (
            <div className={cn(
              "px-1.5 py-0.5 whitespace-pre-wrap break-words leading-relaxed text-[15px]",
              (messageType === "image" || messageType === "video") && "mt-1.5"
            )}>
              {renderTextWithLinks(message.text)}
            </div>
          )}

          {/* Meta Info (Time & Status) */}
          <div className={cn(
            "flex items-center justify-end gap-1 px-1",
            ((messageType === "image" || messageType === "video") && !message.text)
              ? "absolute bottom-1.5 right-2.5 z-10 text-white/90 drop-shadow-md"
              : "mt-0.5 self-end pb-0.5"
          )}>
            <span className={cn("text-[10px] font-medium opacity-70",
              ((messageType === "image" || messageType === "video") && !message.text) && "opacity-90"
            )}>
              {format(createdAt, "HH:mm")}
            </span>
            {isMine && !message.pending && (
              <CheckCheck
                className={cn(
                  "w-3.5 h-3.5",
                  (message.readBy?.length ?? 0) > 1
                    ? (((messageType === "image" || messageType === "video") && !message.text) ? "text-[#34B7F1] drop-shadow-md" : "text-[#53bdeb]")
                    : "opacity-60"
                )}
              />
            )}
            {message.pending && <Loader2 className="w-3 h-3 animate-spin opacity-60" />}
          </div>
        </div>

        {/* Options Overlay */}
        <AnimatePresence>
          {showOptions && isMine && !message.pending && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onDelete?.(message)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-[#2A3942] hover:bg-[#3C4A54] rounded-full shadow-lg flex items-center justify-center transition-colors z-30"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default MessageBubble;
