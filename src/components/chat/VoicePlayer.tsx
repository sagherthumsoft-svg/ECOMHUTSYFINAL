"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface VoicePlayerProps {
  url: string;
  duration?: number;
  isMine?: boolean;
  senderPhoto?: string | null;
}

export default function VoicePlayer({ url, duration = 0, isMine = false, senderPhoto }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (duration > 0 && audioDuration === 0) setAudioDuration(duration);
  }, [duration, audioDuration]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration !== Infinity && !isNaN(audioRef.current.duration)) {
      setAudioDuration(audioRef.current.duration);
    }
    setIsLoaded(true);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const displayTime = isPlaying || currentTime > 0 ? currentTime : audioDuration;
  const progressPerc = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
  
  const thumbColor = isMine ? '#ffffff' : '#00A884';
  const trackFilled = isMine ? 'rgba(255,255,255,0.7)' : '#00A884';
  const trackUnfilled = isMine ? 'rgba(255,255,255,0.2)' : 'rgba(0,168,132,0.2)';

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[260px] max-w-[320px]" onClick={(e) => e.stopPropagation()}>
      <audio 
        ref={audioRef} 
        src={url} 
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
      
      {/* Avatar & Mic Indicator Overlay */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
          {senderPhoto ? (
            <img src={senderPhoto} className="w-full h-full object-cover" alt="Sender avatar" />
          ) : (
             <div className="w-full h-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
               <Mic className="w-6 h-6 text-slate-500 dark:text-slate-400 opacity-60" />
             </div>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-[#202C33] dark:bg-zinc-800 rounded-full p-[2px] shadow-sm flex items-center justify-center">
           <Mic className={`w-[14px] h-[14px] ${(currentTime > 0 || isPlaying) ? 'text-[#34B7F1]' : (isMine ? 'text-white' : 'text-[#00A884]')} fill-current`} />
        </div>
      </div>

      <button 
        onClick={togglePlay}
        className="w-10 h-10 shrink-0 flex items-center justify-center text-white/90 hover:text-white transition-transform active:scale-95 ml-1"
      >
        {isPlaying ? (
          <Pause className="w-7 h-7 fill-current opacity-90" />
        ) : (
          <Play className="w-7 h-7 ml-1 fill-current opacity-90" />
        )}
      </button>
      
      <div className="flex-1 flex flex-col justify-center gap-1.5 mt-1 pr-2">
        <div className="group relative w-full h-[18px] flex items-center cursor-pointer">
          <input 
            type="range" 
            min="0" 
            max={audioDuration || 1} 
            step="0.01"
            value={currentTime} 
            onChange={onSeek}
            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
          />
          {/* Custom Track */}
          <div className="w-full h-1.5 rounded-full overflow-hidden relative" style={{ backgroundColor: trackUnfilled }}>
             <div 
               className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
               style={{ width: `${progressPerc}%`, backgroundColor: trackFilled }}
             />
          </div>
          {/* Custom Thumb */}
          <div 
             className="absolute w-3.5 h-3.5 rounded-full shadow-sm shadow-black/20 pointer-events-none transition-all duration-75 group-hover:scale-125"
             style={{ 
               left: `calc(${progressPerc}% - 7px)`,
               backgroundColor: thumbColor
             }}
          />
        </div>
        
        <div className="flex justify-between items-center -mt-0.5">
          <span className="text-[11px] font-medium tracking-wide opacity-80">
            {formatTime(displayTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
