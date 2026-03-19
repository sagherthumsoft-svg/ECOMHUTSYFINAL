"use client";

import { Message } from "@/types";
import { 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  DownloadCloud
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { getFileExtension, getFileIconColor, formatFileSize, downloadFile } from "@/lib/fileUtils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  initialMessageId?: string;
}

export default function MediaModal({
  isOpen,
  onClose,
  messages,
  initialMessageId,
}: MediaModalProps) {
  // Filter only media messages
  const mediaMessages = messages.filter((m) => {
    const type = m.type || m.messageType;
    return type === "image" || type === "video" || type === "pdf" || type === "file";
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Sync index with initialMessageId
  useEffect(() => {
    if (initialMessageId && isOpen) {
      const index = mediaMessages.findIndex((m) => (m.messageId || m.id) === initialMessageId);
      if (index !== -1) {
        setCurrentIndex(index);
        setZoom(1);
        setRotation(0);
      }
    }
  }, [initialMessageId, isOpen, mediaMessages]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < mediaMessages.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  }, [mediaMessages.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaMessages.length - 1));
    setZoom(1);
    setRotation(0);
  }, [mediaMessages.length]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailRef.current) {
      const activeThumb = thumbnailRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentIndex]);

  const currentMessage = mediaMessages[currentIndex];

  const handleDownload = async () => {
    if (!currentMessage?.fileUrl) return;
    downloadFile(currentMessage.fileUrl, currentMessage.fileName || "download");
  };

  if (!isOpen || !currentMessage) return null;

  const msgType = currentMessage.type || currentMessage.messageType;
  const isImage = msgType === "image";
  const isVideo = msgType === "video";
  const ext = getFileExtension(currentMessage.fileName || "").toLowerCase();
  const isPdf = msgType === "pdf" || ext === "pdf";
  const isPreviewable = isPdf || ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext);
  const isDoc = !isImage && !isVideo && !isPreviewable;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-[#0B141A]/98 backdrop-blur-md select-none"
      >
        {/* Top bar (Header) */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-[110]">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-all text-white/90 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-white font-medium text-[15px] truncate max-w-[200px] sm:max-w-md">
                {currentMessage.fileName || currentMessage.senderName || "Media"}
              </span>
              <span className="text-white/50 text-xs">
                {currentMessage.senderName} • {currentMessage.createdAt ? format(currentMessage.createdAt, "MMM d, h:mm a") : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 mr-2">
              <button 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition"
              ><ZoomOut className="w-4 h-4" /></button>
              <span className="text-[11px] text-white/50 min-w-[40px] text-center font-mono">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition"
              ><ZoomIn className="w-4 h-4" /></button>
            </div>
            
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-2.5 hover:bg-white/10 rounded-full text-white/90 transition"
              title="Rotate"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleDownload}
              className="p-2.5 hover:bg-white/10 rounded-full text-white/90 transition flex items-center gap-2"
              title="Download HD"
            >
              <DownloadCloud className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-medium">Download</span>
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Side Navigation Overlays */}
          <div 
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-24 z-20 flex items-center justify-center cursor-pointer group"
          >
            <div className="p-3 bg-black/20 group-hover:bg-black/40 rounded-full text-white/50 group-hover:text-white transition-all transform scale-90 group-hover:scale-100">
              <ChevronLeft className="w-10 h-10 drop-shadow-md" />
            </div>
          </div>

          <div 
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-24 z-20 flex items-center justify-center cursor-pointer group"
          >
            <div className="p-3 bg-black/20 group-hover:bg-black/40 rounded-full text-white/50 group-hover:text-white transition-all transform scale-90 group-hover:scale-100">
              <ChevronRight className="w-10 h-10 drop-shadow-md" />
            </div>
          </div>

          {/* Main Media Container */}
          <motion.div
            key={currentIndex}
            drag={zoom > 1}
            dragConstraints={{ left: -300 * zoom, right: 300 * zoom, top: -300 * zoom, bottom: 300 * zoom }}
            dragElastic={0.1}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
              scale: zoom, 
              opacity: 1,
              rotate: rotation 
            }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onWheel={(e) => {
               if (e.deltaY < 0) setZoom(z => Math.min(4, z + 0.1));
               else setZoom(z => Math.max(0.5, z - 0.1));
            }}
            className={cn("w-full h-full flex items-center justify-center p-4", zoom > 1 ? "cursor-grab active:cursor-grabbing" : "")}
          >
            {isImage && (
              <img
                src={currentMessage.fileUrl}
                alt={currentMessage.fileName}
                className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300 pointer-events-none"
                draggable={false}
              />
            )}

            {isVideo && (
              <div className="w-full max-w-4xl max-h-[80vh] aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                <video
                  src={currentMessage.fileUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              </div>
            )}

            {isPreviewable && (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 max-w-6xl mx-auto">
                 <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentMessage.fileUrl || "")}&embedded=true`} 
                  className="w-full h-full bg-white rounded-xl shadow-2xl border-none"
                />
              </div>
            )}

            {isDoc && (
              <div className="flex flex-col items-center gap-8 bg-[#202C33] p-12 rounded-[2.5rem] shadow-2xl border border-white/5 max-w-md w-full animate-in zoom-in-95 duration-300">
                <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl", getFileIconColor(currentMessage.fileName || ""))}>
                  <FileText className="w-12 h-12 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2 truncate max-w-xs">{currentMessage.fileName}</h3>
                  <p className="text-white/50 text-sm">
                    {currentMessage.fileType?.toUpperCase() || getFileExtension(currentMessage.fileName || "").toUpperCase()} • {currentMessage.fileSize ? formatFileSize(currentMessage.fileSize) : "HD File"}
                  </p>
                </div>
                <button 
                  onClick={handleDownload}
                  className="w-full py-4 bg-[#00A884] hover:bg-[#06CF9C] text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#00A884]/20"
                >
                  <DownloadCloud className="w-6 h-6" /> Download ORIGINAL (HD)
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom Thumbnail Strip */}
        <div className="h-28 bg-black/40 backdrop-blur-xl border-t border-white/5 flex items-center px-4 overflow-hidden relative">
          <div 
            ref={thumbnailRef}
            className="flex items-center gap-2 h-full mx-auto overflow-x-auto no-scrollbar py-4 scroll-smooth"
          >
            {mediaMessages.map((m, idx) => (
              <button
                key={m.messageId || m.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoom(1);
                  setRotation(0);
                }}
                className={cn(
                  "w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-all duration-300 border-2 relative",
                  currentIndex === idx 
                    ? "border-[#00A884] scale-110 shadow-lg brightness-110 z-10" 
                    : "border-transparent opacity-40 hover:opacity-100 grayscale-[0.5] hover:grayscale-0 hover:scale-105"
                )}
              >
                {m.type === "image" || m.messageType === "image" ? (
                  <img src={m.fileUrl} className="w-full h-full object-cover" loading="lazy" />
                ) : m.type === "video" || m.messageType === "video" ? (
                  <div className="w-full h-full bg-[#1e293b] flex items-center justify-center">
                    <Play className="w-5 h-5 text-white/70 fill-white/20" />
                  </div>
                ) : (
                  <div className={cn("w-full h-full flex items-center justify-center", getFileIconColor(m.fileName || ""))}>
                     <FileText className="w-7 h-7 text-white/90" />
                  </div>
                )}
                <div className={cn(
                  "absolute inset-0 transition-opacity bg-[#00A884]/10",
                  currentIndex === idx ? "opacity-100" : "opacity-0"
                )} />
              </button>
            ))}
          </div>
        </div>

        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
