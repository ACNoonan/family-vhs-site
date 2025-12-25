"use client";

import { useState, useEffect } from "react";
import { PasswordGate } from "@/components/PasswordGate";
import { VideoGallery } from "@/components/VideoGallery";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is already authenticated by trying to fetch videos
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      setIsAuthenticated(response.status !== 401);
    } catch {
      setIsAuthenticated(false);
    }
  };

  // Show loading while checking auth status
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <VideoGallery />;
}
