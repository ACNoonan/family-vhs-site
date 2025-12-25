"use client";

import { useState, useEffect, useRef } from "react";

interface Video {
  key: string;
  name: string;
  size: number;
}

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

export function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideoUrl();
    
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [video.key]);

  const fetchVideoUrl = async () => {
    try {
      // Encode the key as base64 to handle slashes
      const encodedKey = Buffer.from(video.key).toString("base64");
      const response = await fetch(`/api/videos/${encodedKey}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setVideoUrl(data.url);
      }
    } catch {
      setError("Failed to load video");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Video title */}
      <div className="absolute top-4 left-4 z-50">
        <h2 className="text-white text-lg font-semibold bg-black/50 backdrop-blur px-4 py-2 rounded-lg">
          {video.name}
        </h2>
      </div>

      {/* Video container */}
      <div className="w-full max-w-6xl aspect-video relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-2xl">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400">Loading video...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-2xl">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError("");
                  setLoading(true);
                  fetchVideoUrl();
                }}
                className="px-6 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl || undefined}
            controls
            autoPlay
            className="w-full h-full rounded-2xl bg-black shadow-2xl"
            controlsList="nodownload"
          >
            Your browser does not support the video tag.
          </video>
        )}

        {/* VHS effect overlay (subtle) */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
        </div>
      </div>

      {/* Navigation hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-sm">
        Press <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-400">ESC</kbd> to close
      </div>
    </div>
  );
}

