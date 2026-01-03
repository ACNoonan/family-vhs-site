"use client";

import { useState, useEffect, useRef } from "react";
import { VideoPlayer } from "./VideoPlayer";

interface Video {
  key: string;
  name: string;
  displayName?: string;
  size: number;
  lastModified: string;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export function VideoGallery() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/videos");

      if (response.status === 401) {
        window.location.reload();
        return;
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setVideos(data.videos || []);
      }
    } catch {
      setError("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.reload();
  };

  const startRename = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVideo(video.key);
    setEditName(video.displayName || video.name);
  };

  const cancelRename = () => {
    setEditingVideo(null);
    setEditName("");
  };

  const saveRename = async (videoKey: string) => {
    if (!editName.trim()) {
      cancelRename();
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/videos/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoKey, displayName: editName.trim() }),
      });

      if (response.ok) {
        setVideos((prev) =>
          prev.map((v) =>
            v.key === videoKey ? { ...v, displayName: editName.trim() } : v
          )
        );
      }
    } catch (err) {
      console.error("Failed to rename:", err);
    } finally {
      setSaving(false);
      setEditingVideo(null);
      setEditName("");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Loading your memories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-lg bg-slate-900/50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mini VHS icon */}
              <div className="w-12 h-8 bg-gradient-to-b from-slate-700 to-slate-800 rounded border border-slate-600 flex items-center justify-center shadow-lg">
                <span className="text-[6px] font-bold text-amber-400/80">
                  VHS
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
                  Family Archive
                </h1>
                <p className="text-slate-500 text-xs">{videos.length} videos</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-14 mx-auto mb-6 bg-gradient-to-b from-slate-700 to-slate-800 rounded-lg border-2 border-slate-600 flex items-center justify-center">
              <span className="text-amber-400/50 text-lg">?</span>
            </div>
            <p className="text-slate-400">No videos found in the archive</p>
            <p className="text-slate-500 text-sm mt-2">
              Videos are still being uploaded...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video, index) => (
              <VideoCard
                key={video.key}
                video={video}
                index={index}
                isEditing={editingVideo === video.key}
                editName={editName}
                saving={saving}
                onSelect={() => setSelectedVideo(video)}
                onStartRename={(e) => startRename(video, e)}
                onEditNameChange={setEditName}
                onSaveRename={() => saveRename(video.key)}
                onCancelRename={cancelRename}
                formatSize={formatSize}
              />
            ))}
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}

interface VideoCardProps {
  video: Video;
  index: number;
  isEditing: boolean;
  editName: string;
  saving: boolean;
  onSelect: () => void;
  onStartRename: (e: React.MouseEvent) => void;
  onEditNameChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  formatSize: (bytes: number) => string;
}

function VideoCard({
  video,
  index,
  isEditing,
  editName,
  saving,
  onSelect,
  onStartRename,
  onEditNameChange,
  onSaveRename,
  onCancelRename,
  formatSize,
}: VideoCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    // Start preview after a short delay
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      if (videoRef.current && video.previewUrl) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="group relative bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10"
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video thumbnail/preview area */}
      <button
        onClick={onSelect}
        className="w-full aspect-video bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden"
      >
        {/* Thumbnail image */}
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.displayName || video.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isHovering && video.previewUrl ? "opacity-0" : "opacity-100"
            }`}
          />
        )}

        {/* Preview video (shown on hover) */}
        {video.previewUrl && (
          <video
            ref={videoRef}
            src={video.previewUrl}
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isHovering ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Fallback when no thumbnail */}
        {!video.thumbnailUrl && (
          <>
            {/* Film grain effect */}
            <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />

            {/* VHS style lines */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundSize: "100% 4px" }}
            />
          </>
        )}

        {/* Play icon overlay */}
        <div
          className={`relative z-10 w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center transition-all ${
            isHovering
              ? "opacity-0 scale-75"
              : "group-hover:bg-amber-500/30 group-hover:scale-110"
          }`}
        >
          <svg
            className="w-6 h-6 text-amber-400 ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* VHS timestamp effect - file size */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-amber-400 text-xs font-mono z-10">
          {formatSize(video.size)}
        </div>
      </button>

      {/* Video info */}
      <div className="p-4">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveRename();
                if (e.key === "Escape") onCancelRename();
              }}
              className="flex-1 bg-slate-700 text-white px-2 py-1 rounded text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
              autoFocus
              disabled={saving}
            />
            <button
              onClick={onSaveRename}
              disabled={saving}
              className="px-2 py-1 bg-amber-500 text-slate-900 rounded text-xs font-medium hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={onCancelRename}
              disabled={saving}
              className="px-2 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-500 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-medium truncate group-hover:text-amber-200 transition-colors flex-1">
              {video.displayName || video.name}
            </h3>
            <button
              onClick={onStartRename}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-400 transition-all"
              title="Rename video"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>
        )}
        {!isEditing && (
          <p className="text-slate-500 text-sm mt-1">
            {video.previewUrl ? "Hover to preview" : "Click to play"}
          </p>
        )}
      </div>
    </div>
  );
}
