"use client";

import { useState } from "react";

interface PasswordGateProps {
  onSuccess: () => void;
}

export function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || "Invalid password");
        setPassword("");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-10 shadow-2xl">
          {/* VHS tape icon */}
          <div className="flex justify-center mb-8">
            <div className="relative w-24 h-16 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border-2 border-slate-600 shadow-xl">
              <div className="absolute top-2 left-3 w-6 h-6 bg-slate-700 rounded-full border border-slate-500" />
              <div className="absolute top-2 right-3 w-6 h-6 bg-slate-700 rounded-full border border-slate-500" />
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-700 rounded" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-bold text-amber-400/80 tracking-wider mt-1">VHS</span>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent">
            Family Archive
          </h1>
          <p className="text-slate-400 text-center mb-8 text-sm">
            Enter the family password to access the videos
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg py-2 border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking...
                </span>
              ) : (
                "Enter Archive"
              )}
            </button>
          </form>
        </div>

        <p className="text-slate-500 text-xs text-center mt-6">
          Memories preserved forever 📼
        </p>
      </div>
    </div>
  );
}

